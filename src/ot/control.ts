/// <reference path='operation.ts' />

/// <reference path='../base/deque.ts' />
/// <reference path='../base/list.ts' />
/// <reference path='../base/logging.ts' />

function listTransform(op:Operation, list:Array<Operation>):any {
  var tOp = op;
  for (var otherOp of list) {
    tOp = tOp.transform(otherOp);
  }
  return tOp;
}

function symmetricListTransform(op:Operation, list:Array<Operation>):Array<any> {
  var tOp = op;
  var tList:Array<Operation> = [];

  for (var otherOp of list) {
    tList.push(otherOp.transform(tOp));
    tOp = tOp.transform(otherOp);
  }

  return [tOp, tList]
}

interface OTClientTransport {
  connect(
    documentId: string,

    // handleSiteId will always be called before the first call to handleConnectedClients
    // which will always be called before the first call to handleRemoteOp
    handleSiteId: (siteId: number) => void,
    handleConnectedClients:(connectedClients: Array<number>) => void,
    handleRemoteOp: (op: Operation) => void
  ): void;

  broadcastOperation(operation: Operation): void;
}

interface OTClientListener {
  clientWillHandleRemoteOps(model:OperationModel): void;
  clientDidHandleRemoteOps(model:OperationModel): void;
  clientDidConnectToDocument(): void;
}

class OTClient {
  private _listeners:Array<OTClientListener> = [];

  private _siteId: number = -1;
  private _siteOpIdGen = new IDGenerator();

  // TODO(ryan): What should this be before we've seen any ops from the server?
  // I haven't carefully reasoned through whether -1 works in all cases.
  private _lastRemoteTotalOrderingId:number = -1;

  // Here we keep a transformation path for each other client.
  // It contains all and only those ops *not* generated by each
  // client. That is: _transformationPathBySiteId[someSiteId]
  // represents a path for transforming operations generated by
  // the client with someSiteId.
  private _transformationPathBySiteId:{ [siteId: string]: Array<Operation> } = {};

  private _connectCalled: boolean = false;
  private _connectedToDocument: boolean = false;

  constructor(
    private _transport: OTClientTransport,
    private _documentId: string,
    private _model: OperationModel
  ) { }

  public connect(): OTClient {
    // Make sure we only ever call this once
    if (this._connectCalled) {
      fail('connect() called more than once on an OTClient instance!');
      return;
    }
    this._connectCalled = true;

    this._transport.connect(
      this._documentId,
      this.handleSiteId.bind(this),
      this.handleDocumentConnectedSites.bind(this),
      this.handleRemoteOp.bind(this)
    );
    // So that we can do let client = (new OTClient).connect();
    return this;
  }

  public addListener(listener:OTClientListener) {
    this._listeners.push(listener);
  }

  private handleSiteId(siteId: number) {
    this._siteId = siteId;
  }

  private handleDocumentConnectedSites(connectedSites: Array<number>) {
    if (!this._connectedToDocument) {
      // We're officially connected to this document
      this._connectedToDocument = true;

      for (var listener of this._listeners) {
        listener.clientDidConnectToDocument();
      }
    }

    for (var siteId of connectedSites) {
      // Initialize this site's transformation path
      this.pathForSiteId(siteId);
    }
  }

  public handleLocalOp(op:Operation) {
    // Execute the operation locally
    this._model.execute(op);

    // Timestamp the op with our site id and the total ordering id
    // of the last op from the server that we executed locally
    op.setTimestamp(new Timestamp(this._siteId, this._siteOpIdGen.next(), this._lastRemoteTotalOrderingId));

    // Save op at the end of every other client's transformation path
    for (var siteId in this._transformationPathBySiteId) {
      if (siteId === this._siteId) {
        fail("Should not have a transformation path for this client.");
      }
      this._transformationPathBySiteId[siteId].push(op);
    }

    this._transport.broadcastOperation(op);
  }

  // This must be called for op only after every other op from
  // op.timestamp().siteId has been processed by it.
  public handleRemoteOp(op:Operation) {
    for (var listener of this._listeners) {
      listener.clientWillHandleRemoteOps(this._model);
    }

    if (DEBUG) {
      let json = {};
      op.fillJson(json);
      log('OTClient', 'handleRemoteOp', 'siteId is ', this._siteId, ' got operation ', JSON.stringify(json));
    }

    if (op.timestamp().siteId() === this._siteId) {
      // update op's TO in every transformation path

      for (var siteId in this._transformationPathBySiteId) {
        var path = this._transformationPathBySiteId[siteId];

        for (var i = 0; i < path.length; i++) {
          let otherOp = path[i];
          if (otherOp.timestamp().siteId() === op.timestamp().siteId() &&
            otherOp.timestamp().siteOpId() === op.timestamp().siteOpId()) {
            otherOp.setTimestamp(op.timestamp());
          }
        }
      }

      this._lastRemoteTotalOrderingId = op.timestamp().totalOrderingId();
      log("handleRemoteOp got operation generated locally. Returning early.");
      return;
    }

    console.log('continuing');

    // 1. Locate the transformation path for the corresponding site
    var path = this.pathForSiteId(op.timestamp().siteId());

    // 2, 3 split into L1 and L2
    var l1: Array<Operation> = [];
    var l2: Array<Operation> = [];
    for (var i = 0; i < path.length; i++) {
      var other = path[i];

      // If other has total ordering id less than op's remoteTotalOrderingId,
      // it means that it was executed at op's source site before op was.
      // So we can skip it.
      if (other.timestamp().totalOrderingId() <= op.timestamp().remoteTotalOrderingId()) {
        continue;
      }

      // Split the rest of the operations into those that
      //
      // (a) have a total order before op's total order but after its remote total order id
      //     (i.e. they were created before op but not at op's site before it was executed)
      //     Said another way, l1 contains all 'others' where:
      //
      //     op.remoteTotalOrderingId() < other.totalOrderingId() < op.totalOrderingId()
      //
      // (b) Local ops that have been applied but haven't been sent to the server (so they
      //     don't have a total order id but they will have one after op)
      //

      // (a)
      if (op.timestamp().remoteTotalOrderingId() < other.timestamp().totalOrderingId() &&
        other.timestamp().totalOrderingId() < op.timestamp().totalOrderingId()) {

        if (op.timestamp().siteId() === other.timestamp().siteId()) {
          // TODO(ryan): comment this case and why it exists (it's a result of setting
          // RTO to -1 when we initially connect).
          continue;
        }


        l1.push(other);
      }

      // (b)
      else if (other.timestamp().totalOrderingId() === null) {
        l2.push(other);
      }
    }

    // 4, 5 -- transform appropriately. a 'over' b in this context means a with b
    // in its context. So 'opOverL1' means op which has been transformed to include
    // L1 in its context.

    let opOverL1:Operation = null;
    let l1OverOp:Array<Operation> = null;

    let opOverL1L2:Operation = null;
    let l2OverOp:Array<Operation> = null;

    [opOverL1, l1OverOp] = symmetricListTransform(op, l1);
    [opOverL1L2, l2OverOp] = symmetricListTransform(opOverL1, l2);

    // 6. Execute tOp locally
    this._model.execute(opOverL1L2);

    this._lastRemoteTotalOrderingId = opOverL1L2.timestamp().totalOrderingId();

    // 7. Walk through every other client's transformation path...

    for (var siteId in this._transformationPathBySiteId) {
      var path = this.pathForSiteId(siteId);

      // Find position immediately after the last op in path whose total ordering
      // is less than op's total ordering.
      //
      // Suppose the list is as follows: [a, b, c, [d], e, f, g, h] where [d] is
      // the operation that we break on. Then when we break, i is going to be 4.
      // So we insert at index i.
      //
      // What about if it's the first element? [[a], b, c] -- i is 1 and we insert
      // at 1.
      //
      // What about if it's the last element? [a, b, [c]] -- i is 3 and we insert at
      // 3. Still good.
      //
      var newPath: Array<Operation> = [];

      var i = 0;
      for (; i < path.length; i++) {
        if (path[i].timestamp().totalOrderingId() < op.timestamp().totalOrderingId()) {
          newPath.push(path[i]);
        } else {
          break;
        }
      }

      newPath.push(opOverL1);

      // Now 'replace' the rest of the operations in the path with the operations in l2OverOp
      for (var other of l2OverOp) {
        newPath.push(other);
      }

      this._transformationPathBySiteId[siteId] = newPath;
    }

    console.log(this._listeners);
    for (var listener of this._listeners) {
      listener.clientDidHandleRemoteOps(this._model);
    }
  }

  // private

  private pathForSiteId(siteId:number): Array<Operation> {
    if (!(siteId in this._transformationPathBySiteId)) {
      this._transformationPathBySiteId[siteId] = [];
    }
    return this._transformationPathBySiteId[siteId];
  }

  private broadcast(op:Operation) {
    // Make request. In callback:
    let totalOrderingId:number = -1;
    op.timestamp().setTotalOrderingId(totalOrderingId);
  }
}

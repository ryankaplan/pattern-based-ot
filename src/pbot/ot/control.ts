/// <reference path='operation.ts' />
/// <reference path='../../base/deque.ts' />
/// <reference path='../../base/list.ts' />
/// <reference path='../../base/logging.ts' />

function symmetricListTransform(op: Operation, list: Array<Operation>): Array<any> {
  var tOp = op;
  var tList: Array<Operation> = [];

  for (var otherOp of list) {
    tList.push(otherOp.transform(tOp));
    tOp = tOp.transform(otherOp);
  }

  return [tOp, tList]
}

interface OTClientTransport {
  connect(
    documentId: string,
    
    handleSiteId: (siteId: string) => void,
    handleConnectedClients:(connectedClients: Array<string>) => void,
    handleRemoteOp: (op: Operation) => void,
    handleInitialLoadBegin: () => void,
    handleInitialLoadEnd: () => void
  ): void;

  broadcastOperation(operation: Operation): void;
}

interface OTClientListener {
  // Called when the client receives remote ops that are *not* part
  // of the initial document load.
  clientDidHandleRemoteOps(model: OperationModel): void;
  clientDidConnectToDocument(): void;
}

class OTClient {
  private _listeners:Array<OTClientListener> = [];

  private _siteId: string = '-1';

  // Generates ids for operations generated at this client.
  private _siteOpIdGen = new IDGenerator();

  // Always keeps track of the last total ordering id of a REMOTE operation
  // that we've seen from the server.
  private _lastRemoteTotalOrderingId: number = -1;

  // Here we keep a transformation path for each other client.
  // It contains all and only those ops *not* generated by each
  // client. That is: _transformationPathBySiteId[someSiteId]
  // represents a path for transforming operations generated by
  // the client with someSiteId.
  private _transformationPathBySiteId:{ [siteId: string]: Deque<Operation> } = {};

  private _connectHasBeenCalled: boolean = false;
  private _connectedToDocument: boolean = false;
  private _inInitialLoad: boolean = false;

  constructor(
    private _transport: OTClientTransport,
    private _documentId: string,
    private _model: OperationModel
  ) { }

  public connect(): OTClient {
    if (this._connectHasBeenCalled) {
      fail('connect() called more than once on an OTClient instance!');
      return;
    }
    this._connectHasBeenCalled = true;

    this._transport.connect(
      this._documentId,
      this.handleSiteId.bind(this),
      this.handleDocumentConnectedSites.bind(this),
      this.handleRemoteOp.bind(this),
      () => { this._inInitialLoad = true },
      () => { this._inInitialLoad = false }
    );

    // Return this so that we can do `let client = (new OTClient).connect();`
    return this;
  }

  public addListener(listener: OTClientListener) {
    addElementIfMissing(this._listeners, listener);
  }

  // Called when the server sends this client its siteId
  private handleSiteId(siteId: string) {
    this._siteId = siteId;
  }

  // This is called with all local operations generated by our UI (which represent
  // actions that are being taken by the user). When this function returns, the
  // effect of `op` should be present in all future calls to model.render()
  public handleLocalOp(op: Operation) {

    this._model.execute(op);

    // Timestamp the op with our site id and the current remote total ordering id.
    // We won't know this op's total ordering id until it bounces off the server.
    op.setTimestamp(new Timestamp(this._siteId, this._siteOpIdGen.next(), this._lastRemoteTotalOrderingId));

    // Save op at the end of every other client's transformation path
    for (var siteId in this._transformationPathBySiteId) {
      if (siteId === this._siteId) {
        fail("Should not have a transformation path for this client.");
      }
      this._transformationPathBySiteId[siteId].enqueue(op);
    }

    this._transport.broadcastOperation(op);
  }

  // This is called for every operation broadcast to us from the server, either
  // from other clients or from this client. The latter are useful because it
  // tells us the total ordering id of operations generated by this client.
  public handleRemoteOp(op:Operation) {
    if (DEBUG) {
      let json = {};
      op.fillJson(json);
      this.debugLog('handleRemoteOp called with operation' + JSON.stringify(json));
    }

    if (op.timestamp().siteId() === this._siteId) {
      // This is an acknowledgement of an operation that we sent to the server.
      // Update the operation's total ordering in every transformation path.

      for (var siteId in this._transformationPathBySiteId) {
        var path = this._transformationPathBySiteId[siteId];
        for (var i = 0; i < path.length; i++) {
          let otherOp = path.get(i);
          if (otherOp.timestamp().siteId() === op.timestamp().siteId() &&
            otherOp.timestamp().siteOpId() === op.timestamp().siteOpId()) {
            otherOp.setTimestamp(op.timestamp());
          }
        }
      }

      DEBUG && this.debugLog('transformation paths ' + JSON.stringify(this._transformationPathBySiteId));
      this.debugLog('handleRemoteOp -- operation is local. Will return.');
      return;
    }

    // If we got here then we're handling an operation from some other client.
    // Fetch its transformation path.
    var path = this.pathForSiteId(op.timestamp().siteId());

    // Here we do a simple form of garbage collection. Purge ops in the path whose
    // total ordering id is before this new operation's remote total ordering id
    // (meaning that they were delivered to this new op's generating site before
    // op was created).
    while (
        path.length > 0 &&
        path.peekFront().timestamp() !== null &&
        path.peekFront().timestamp().totalOrderingId() <= op.timestamp().remoteTotalOrderingId()
      ) {
      path.popFront();
    }
    
    // Split the remainder of the path into two arrays: l1 and l2. These are named to match the
    // paper cited in the README. The meanings of l1 and l2 are explained in the loop.
    var l1: Array<Operation> = [];
    var l2: Array<Operation> = [];

    for (var i = 0; i < path.length; i++) {
      var otherOp = path.get(i);

      if (
          otherOp.timestamp().totalOrderingId() !== null &&
          otherOp.timestamp().totalOrderingId() <= op.timestamp().remoteTotalOrderingId()
      ) {
        fail('We should have purged all elements like this in the garbage collection above.');
      }

      // Split the rest of the operations into l1 and l2.
      //
      // (a) Elements in l1 have a total order before op's total order but after its remote
      //     total ordering id (i.e. they were created before op but not at op's site before
      //     it was executed). Succinctly: l1 contains all otherOps where:
      //
      //     op.remoteTotalOrderingId() < otherOp.totalOrderingId() < op.totalOrderingId()
      //
      // (b) Elements in l2 are local ops that have been applied but haven't been sent to the
      //     server (so they don't have a total order id but they will have one after op).
      //

      // (b)
      if (otherOp.timestamp().totalOrderingId() === null) {
        l2.push(otherOp);
      }

      // (a)
      else if (
          op.timestamp().remoteTotalOrderingId() < otherOp.timestamp().totalOrderingId() &&
          otherOp.timestamp().totalOrderingId() < op.timestamp().totalOrderingId()
      ) {

        // op.timestamp().siteId() can't be otherOp.timestamp().siteId() by item 7 of
        // Remote Processing on page 11 of the paper. We don't put transformed operations
        // into the transformation path of the site that generated them.
        if (op.timestamp().siteId() === otherOp.timestamp().siteId()) {
          fail('Invalid assumption. See comment above.');
        }

        l1.push(otherOp);
      }
    }

    DEBUG && this.debugLog('l1 : ' + JSON.stringify(l1));
    DEBUG && this.debugLog('l2 : ' + JSON.stringify(l2));

    // Transform our new operation against l1 and l2. 'op over l1' in this context means
    // op transformed so that the ops in l1 are in its context.

    let opOverL1:Operation = null;
    let l1OverOp:Array<Operation> = null;

    let opOverL1L2:Operation = null;
    let l2OverOp:Array<Operation> = null;

    [opOverL1, l1OverOp] = symmetricListTransform(op, l1);
    [opOverL1L2, l2OverOp] = symmetricListTransform(opOverL1, l2);

    DEBUG && this.debugLog('executing operation ' + JSON.stringify(opOverL1L2));

    // Execute tOp locally
    this._model.execute(opOverL1L2);
    this._lastRemoteTotalOrderingId = opOverL1L2.timestamp().totalOrderingId();

    // Walk through every other client's transformation path. Find the position
    // immediately after the last op in path whose total ordering id is less than
    // op's total ordering.
    for (var siteId in this._transformationPathBySiteId) {
      if (siteId === op.timestamp().siteId()) {
        // TODO(ryan): We don't need to build a deque here either.
        //
        // Ignore the transformation path for the client that generated the op.
        // New transformation path for this site becomes L1 + L2.
        let newPath = new Deque<Operation>();
        for (var i = 0; i < l1OverOp.length; i++) {
          newPath.pushBack(l1OverOp[i]);
        }
        for (var i = 0; i < l2OverOp.length; i++) {
          newPath.pushBack(l2OverOp[i]);
        }
        this._transformationPathBySiteId[siteId] = newPath;
        continue;
      }

      var path = this.pathForSiteId(siteId);

      // TODO(ryan): We don't need to build a new deque here. Build a deque that
      // lets you insert at a particular index.
      var newPath = new Deque<Operation>();

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
      var i = 0;
      for (; i < path.length; i++) {
        if (path.get(i).timestamp().totalOrderingId() !== null &&
            path.get(i).timestamp().totalOrderingId() < op.timestamp().totalOrderingId()) {
          newPath.pushBack(path.get(i));
        } else {
          break;
        }
      }

      newPath.pushBack(opOverL1);

      // Now 'replace' the rest of the operations in the path with the operations in l2OverOp
      for (var other of l2OverOp) {
        newPath.pushBack(other);
      }

      this._transformationPathBySiteId[siteId] = newPath;
    }

    if (!this._inInitialLoad) {
      for (var listener of this._listeners) {
        listener.clientDidHandleRemoteOps(this._model);
      }
    }
  }

  private debugLog(...args: any[]): void {
    let myArgs = [ 'siteId : ' + this._siteId ];
    for (var i = 0; i < arguments.length; i++) {
      myArgs.push(arguments[i]);
    }
    Function.apply.call(debugLog, null, myArgs);
  }

  private handleDocumentConnectedSites(connectedSites: Array<string>) {
    // Create a transformation path for every connected site.
    // TODO(ryan): remove transformation paths for missing sites.
    for (var siteId of connectedSites) {
      if (siteId !== this._siteId) {
        // Initialize this site's transformation path
        this.pathForSiteId(siteId);
      }
    }

    if (!this._inInitialLoad && !this._connectedToDocument) {
      // We're officially connected to this document
      this._connectedToDocument = true;

      for (var listener of this._listeners) {
        listener.clientDidConnectToDocument();
      }
    }
  }

  private pathForSiteId(siteId: string): Deque<Operation> {
    if (!(siteId in this._transformationPathBySiteId)) {
      this._transformationPathBySiteId[siteId] = new Deque<Operation>();
    }
    return this._transformationPathBySiteId[siteId];
  }
}

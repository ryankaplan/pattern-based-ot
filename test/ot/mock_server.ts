/// <reference path='../../src/base/lang.ts' />

/// <reference path='../../src/ot/operation.ts' />
/// <reference path='../../src/ot/text.ts' />


class MockServer {
  private _siteIdGen:IDGenerator = new IDGenerator();
  private _totalOrderingGen:IDGenerator = new IDGenerator();

  private _socketsByDocumentId: { [documentId: string]: Array<MockSocket> } = {};

  // The first map tracks whether we're queueing ops for a particular site.
  // The second tracks all queues ops for that site.
  private _shouldQueueOpsForSiteId:{ [siteId: number]: boolean } = {};
  private _queuedOpsForSiteId:{ [siteId: number]: Array<Operation> } = {};

  public clientConnect():number {
    return this._siteIdGen.next();
  }

  public clientConnectToDocument(socket: MockSocket, documentId: string) {
    if (!(documentId in this._socketsByDocumentId)) {
      this._socketsByDocumentId[documentId] = [];
    }
    this._socketsByDocumentId[documentId].push(socket.siteId());

    // Build up the current room members list
    let siteIds = [];
    for (var socket of this._socketsByDocumentId[documentId]) {
      siteIds.push(socket.siteId());
    }

    // Tell all the sockets in this room about the current room members list
    for (var socket of this._socketsByDocumentId[documentId]) {
      socket.handleDocumentConnectedSites(siteIds);
    }
  }

  public clientListen(newSocket: MockSocket): void {
    for (var socket of this._sockets) {
      socket.handleConnect(newSocket.siteId());
    }
    this._sockets.push(newSocket);
  }

  public clientBroadcast(op:Operation) {
    // Copy to be realistic about memory sharing between sites.
    // TODO(ryan): serialize back and forth to json instead
    let copy = new TextOp(null, null, null);
    copy.copy(<TextOp>op);
    copy.timestamp().setTotalOrderingId(this._totalOrderingGen.next());

    for (var socket of this._sockets) {
      if (this.shouldQueueOp(socket)) {
        debug('Queueing op to siteId', socket.siteId());
        this.queueOp(socket, copy);
      } else {
        debug('Broadcasting to siteId', socket.siteId());
        socket.handleRemoteOp(copy);
      }
    }
  }

  // Helpers for queueing ops for particular sites, to test timing
  public setSocketOffline(socket:MockSocket, shouldQueue:boolean) {
    this._shouldQueueOpsForSiteId[socket.siteId()] = shouldQueue;

    let queuedOps = this._queuedOpsForSiteId[socket.siteId()];
    if (!shouldQueue && queuedOps) {
      // We've stopped queueing ops for this site. Flush!
      debug('Flushing ', queuedOps.length, ' to site ', socket.siteId());
      for (var op of queuedOps) {
        socket.handleRemoteOp(op);
      }
      this._queuedOpsForSiteId[socket.siteId()] = [];
    }
  }

  private shouldQueueOp(socket:MockSocket) {
    if (!(socket.siteId() in this._shouldQueueOpsForSiteId)) {
      return false;
    }
    return this._shouldQueueOpsForSiteId[socket.siteId()];
  }

  private queueOp(socket:MockSocket, op:Operation) {
    if (!(this._queuedOpsForSiteId[socket.siteId()])) {
      this._queuedOpsForSiteId[socket.siteId()] = [];
    }
    this._queuedOpsForSiteId[socket.siteId()].push(op);
  }
}

interface ConnectImmediatelyResult {
  siteId: number;
  connectedSites: Array<number>;
}

class MockSocket implements OTTransport {
  private _siteId:number;
  private _documentId: string;
  private _handleDocumentConnectedSites:(connectedSites:Array<number>) => void;
  private _handleRemoteOp:(op:Operation) => void;

  constructor(private _server:MockServer) { }

  // Called by server

  public siteId(): number {
    return this._siteId;
  }

  public documentId(): string {
    return this._documentId;
  }

  public handleDocumentConnectedSites(connectedSites:Array<number>): void {
    this._handleDocumentConnectedSites(connectedSites);
  }

  public handleRemoteOp(op:Operation):void {
    this._handleRemoteOp(op);
  }

  // Called by client

  public connectImmediately(documentId: string): ConnectImmediatelyResult {
    var res = {
      siteId: null,
      connectedSites: null
    };

    this.connect((function (siteId: number) {
      res.siteId = siteId;
    }).bind(this));

    this.connectToDocument(documentId, (function (connectedSites: Array<number>) {
      res.connectedSites = connectedSites;
    }).bind(this));

    return res;
  }

  public connect(complete:(siteId:number) => void):void {
    this._siteId = this._server.clientConnect();
    complete(this._siteId);
  }

  public connectToDocument(documentId: string, handleConnectedClients:(connectedClients: Array<number>) => void): void {
    this._documentId = documentId;
    this._handleDocumentConnectedSites = handleConnectedClients;
    this._server.clientConnectToDocument(this, documentId);
  }

  public listenForOps(handleRemoteOp:(op:Operation) => void):void {
    assert(this._siteId !== null);
    this._handleRemoteOp = handleRemoteOp;
    this._server.clientListen(this);
  }

  public broadcast(operation:Operation):void {
    this._server.clientBroadcast(operation);
  }
}
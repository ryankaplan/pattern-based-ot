/// <reference path='../../src/base/lang.ts' />

/// <reference path='../../src/ot/operation.ts' />
/// <reference path='../../src/ot/text.ts' />

/// <reference path='../../src/ot/ot_server.ts />

let server = new OTServer(io);

io.on('connection', (socket_: SocketIO.Socket) => {
  let socket = new SocketWrapper(socket_);
  server.handleConnect(socket);

  socket.on('disconnect', function () {
    server.handleDisconnect(socket);
  });

  socket.on('document_connect', function (msg: DocumentConnectMessage) {
    server.handleDocumentConnectMessage(socket, msg);
  });

  socket.on('operation', function (msg: OperationMessage) {
    server.handleOperationMessage(socket, msg);
  });
});

class MockSocket implements OTTransport, WrappableSocket {
  private _socket: SocketIOClient.Socket;
  private _siteId: number = null;

  private _room: string;


  constructor(private _server: OTServer) {}

  // Implement WrappableSocket so that we can pass this to an OTServer
  join(room: string) {

  }

  emit(type: string, obj: any) {

  }

  on(evt: string, func: (obj: any) => void) {

  }

  // Implement OTTransport so that we can pass this to clients



connect(
    documentId: string,

    // handleSiteId will always be called before the first call to handleConnectedClients
    // which will always be called before the first call to handleRemoteOp
    handleSiteId: (siteId: number) => void,
    handleConnectedClients:(connectedClients: Array<number>) => void,
    handleRemoteOp: (op: Operation) => void
  ): void {
    this._socket = io();

    // Handle new site id
    this._socket.on('site_id', (msg: SiteIdMessage) => {
      this._siteId = msg.siteId;
      handleSiteId(msg.siteId);
      this._socket.emit('document_connect', { documentId: documentId });
    });

    // Handle document connections update
    this._socket.on('document_connections', (msg: DocumentConnectionsMessage) => {
      if (msg.connectedSites.indexOf(this._siteId) === -1) { fail('TODO(ryan)'); }
      handleConnectedClients(msg.connectedSites);
    });

    // Handle remote operation
    this._socket.on('operation', (msg: OperationMessage) => {
      log('Socket', 'handleRemoteOperation', msg);
      let textOp = new TextOp(null, null, null);
      textOp.initWithJson(msg.operation);
      handleRemoteOp(textOp);
    });
  }

  // Send an operation to all other sites
  public broadcastOperation(operation: Operation):void {
    let jsonOp = {};
    operation.fillJson(jsonOp);

    let msg: OperationMessage = <OperationMessage>{};
    msg.operation = jsonOp;
    this._socket.emit('operation', msg);
  }
}



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
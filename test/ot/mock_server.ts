/// <reference path='../../src/base/lang.ts' />
/// <reference path='../../src/ot/operation.ts' />
/// <reference path='../../src/ot/ot_server.ts' />
/// <reference path='../../src/ot/text.ts' />


// TODO(ryan): MockSocketServer doesn't handle disconnects, but they're
// an important case to test.
class MockSocketServer implements OTSocketServer {
  private _callbackByEvent: { [evt: string]: (socket: any) => void } = {};
  private _connectedSockets: Array<MockRawServerSocket> = [];

  constructor() {}

  on(evt: string, callback: (socket: any) => void) {
    this._callbackByEvent[evt] = callback;
  }

  handleNewSocketConnection(serverSocket: MockRawServerSocket) {
    this._connectedSockets.push(serverSocket);
    this._callbackByEvent['connection'](serverSocket);
  }

  // Implement OTSocketServer
  send(channel: string, type: string, msg: any) {
    for (var socket of this._connectedSockets) {
      if (socket.channel() === channel) {
        socket.emit(type, msg);
      }
    }
  }
}

class MockRawServerSocket implements RawServerSocket {
  private _callbackByEvt: { [evt: string]: (obj: any) => void } = {};
  private _channel: string = null;
  private _clientSocket: MockRawClientSocket;

  // Helpers
  setClientSocket(clientSocket: MockRawClientSocket) { this._clientSocket = clientSocket; }
  channel(): string { return this._channel; }

  handleMessageFromClient(type: string, obj: any) {
    if (type in this._callbackByEvt) {
      this._callbackByEvt[type](obj);
    } else {
      log('No callback found in MockRawServerSocket for type ' + type);
    }
  }

  // Implement RawServerSocket
  join(channel: string): void { this._channel = channel; }
  emit(type: string, obj: any): void { this._clientSocket.handleMessageFromServer(type, obj); }
  on(evt: string, func: (obj: any) => void): void { this._callbackByEvt[evt] = func; }
}

interface Message {
  type: string;
  value: any;
}

class MockRawClientSocket implements RawClientSocket {
  private _callbackByEvt: { [evt: string]: (obj: any) => void } = {};
  private _serverSocket: MockRawServerSocket;

  private _isQueueingSends: boolean = false;
  private _queuedSends: Array<Message> = [];

  private _isQueueingReceives: boolean = false;
  private _queuedReceives: Array<Message> = [];

  // Just like with socketio, it connects to the server as soon as you create
  // the object. I personally dislike this pattern.
  constructor(private _server: MockSocketServer) {
    this._serverSocket = new MockRawServerSocket();
    this._serverSocket.setClientSocket(this);
    this._server.handleNewSocketConnection(this._serverSocket);
  }

  setIsQueueingSends(isQueueing: boolean) {
    if (isQueueing === this._isQueueingSends) { return; }

    if (!isQueueing) {
      // flush sends
      for (var msg of this._queuedSends) {
        this._serverSocket.handleMessageFromClient(msg.type, msg.value);
      }
      this._queuedSends = [];
    }

    this._isQueueingSends = isQueueing;
  }

  setIsQueueingReceives(isQueueing: boolean) {
    if (isQueueing === this._isQueueingReceives) { return; }

    if (!isQueueing) {
      // flush receives
      for (var msg of this._queuedReceives) {
        if (msg.type in this._callbackByEvt) {
          this._callbackByEvt[msg.type](msg.value);
        } else {
          fail('No callback found in MockRawClientSocket for type ' + msg.type);
        }
      }
      this._queuedReceives = [];
    }

    this._isQueueingReceives = isQueueing;
  }

  handleMessageFromServer(type: string, obj: any) {
    if (this._isQueueingReceives) {
      this._queuedReceives.push({
        type: type,
        value: obj
      });
      return;
    }

    if (type in this._callbackByEvt) {
      this._callbackByEvt[type](obj);
    } else {
      fail('No callback found in MockRawClientSocket for type ' + type);
    }
  }

  // Used by client to send/receive from server
  on(evt: string, func: (val: any) => void) {
    this._callbackByEvt[evt] = func;
  }

  emit(type: string, obj: any) {
    if (this._isQueueingSends) {
      this._queuedSends.push({
        type: type,
        value: obj
      });
      return;
    }

    this._serverSocket.handleMessageFromClient(type, obj);
  }
}

/*





let mockSocketServer = new MockSocketServer();
let server = new OTServer(mockSocketServer);

// This should look a lot like the code in server.ts
mockSocketServer.on('connection', (socket_: RawServerSocket) => {
  let socket = new OTSocketWrapper(socket_);
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

class MockSockett implements OTClientTransport, WrappableSocket {
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

  // Implement OTClientTransport so that we can pass this to clients



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

class MockSocket implements OTClientTransport {
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

  */
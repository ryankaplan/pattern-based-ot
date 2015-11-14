/// <reference path='../base/lang.ts' />
/// <reference path='../base/list.ts' />
/// <reference path='../ot/control_messages.ts' />
/// <reference path='../ot/operation.ts' />
/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/socket.io/socket.io.d.ts' />

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io: SocketIO.Server = require('socket.io')(http);

// Serve data out of /static
app.use(express.static(__dirname + '/../../'));

class SocketWrapper {
  private _siteId: number;
  private _documentId: string;
  constructor(private _socket: SocketIO.Socket) { }

  documentId(): string { return this._documentId; }
  setDocumentId(documentId: string): void { this._documentId = documentId; }
  siteId(): number { return this._siteId; }
  setSiteId(siteId: number): void { this._siteId = siteId; }

  join(room: string) { this._socket.join(room); }
  emit(type: string, obj: any) { this._socket.emit(type, obj); }
  on(evt: string, func: (obj: any) => void) { this._socket.on(evt, func); }
}

class PatternBasedOTServer {

  private _siteIdGen = new IDGenerator();
  private _totalOrderingGen = new IDGenerator();
  private _sitesByDocumentId: { [documentId: string]: Array<number> } = {};

  constructor(private _io: SocketIO.Server) {}

  private broadcast(type: string, obj: any) {
    this._io.emit(type, obj);
  }

  private sitesForDocumentId(documentId: string): Array<number> {
    if (!(documentId in this._sitesByDocumentId)) {
      this._sitesByDocumentId[documentId] = [];
    }
    return this._sitesByDocumentId[documentId];
  }

  handleConnect(socket: SocketWrapper): void {
    socket.setSiteId(this._siteIdGen.next());
    console.log('handleConnect', JSON.stringify(socket.siteId()));
    socket.emit('site_id', { siteId: socket.siteId() });
  }

  handleDisconnect(socket: SocketWrapper): void {
    console.log('handleDisconnect', JSON.stringify(socket.siteId()));
    let documentId = socket.documentId();
    if (documentId !== null && documentId in this._sitesByDocumentId) {
      removeElement(this._sitesByDocumentId[documentId], documentId);
    }
  }

  handleDocumentConnectMessage(socket: SocketWrapper, msg: DocumentConnectMessage) {
    console.log('handleDocumentConnectMessage', JSON.stringify(socket.siteId()), JSON.stringify(msg));

    socket.setDocumentId(msg.documentId);
    socket.join(socket.documentId());

    // TODO(ryan): verify that it's not in here already
    this.sitesForDocumentId(socket.documentId()).push(socket.siteId());

    this._io.to(socket.documentId()).emit('document_connections', {
      connectedSites: this.sitesForDocumentId(socket.documentId())
    });
  }

  handleOperationMessage(socket: SocketWrapper, msg: OperationMessage) {
    console.log('handleOperationMessage', JSON.stringify(socket.siteId()), JSON.stringify(msg));
    assert(socket.siteId() !== null);
    assert(socket.documentId() !== null);

    // Forward the message along ot other clients in the room
    msg.operation.timestamp['totalOrderingId'] = this._totalOrderingGen.next();
    this._io.to(socket.documentId()).emit('operation', msg);
  }
}

let server = new PatternBasedOTServer(io);

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

app.get('/', function (req: any, res: any) {
  res.writeHead(302, {
    'Location': '/build/www/static/html/collaborative-text-editor.html?documentId=' + randomString(6, ALPHA_NUMERIC)
  });
  res.end();
});


http.listen(3000, function () {
  console.log('listening on *:3000');
});

/// <reference path='../ot/messages.ts' />
/// <reference path='../ot/ot_server.ts' />
/// <reference path='../transport/socket_server.ts' />
/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/socket.io/socket.io.d.ts' />

var express = require('express');
var app = express();
var httpServer = require('http').Server(app);

// Serve data out of /static
app.use(express.static(__dirname + '/../../'));

app.get('/', function (req: any, res: any) {
  res.writeHead(302, {
    'Location': '/build/www/static/html/collaborative-text-editor.html?documentId=' + randomString(6, ALPHA_NUMERIC)
  });
  res.end();
});


httpServer.listen(3000, function () {
  console.log('listening on *:3000');
});

var socketIOServer: SocketIO.Server = require('socket.io')(httpServer);
let server: OTServer = new OTServer(new SocketServer(socketIOServer));

socketIOServer.on('connection', (socket_: SocketIO.Socket) => {
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


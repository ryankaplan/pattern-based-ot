/// <reference path='../../pbot/ot/messages.ts' />
/// <reference path='../../pbot/ot/ot_server.ts' />
/// <reference path='../../pbot/transport/socket_server.ts' />
/// <reference path='../../pbot/typings/node/node.d.ts' />
/// <reference path='../../pbot/typings/socket.io/socket.io.d.ts' />

var express = require('express');
var app = express();
var httpServer = require('http').Server(app);

// Serve data out of /static.
console.log(__dirname + '/static');
app.use(express.static(__dirname + '/static'));

// When a user visits the server at /, direct them to a new collaborative document
// with a random documentId
app.get('/', function (req: any, res: any) {
  res.writeHead(302, {
    'Location': '/html/index.html?documentId=' + randomString(6, ALPHA_NUMERIC)
  });
  res.end();
});

// Serve locally on :3000
httpServer.listen(3000, function () {
  console.log('listening on *:3000');
});

var socketIOServer: SocketIO.Server = require('socket.io')(httpServer);

// SocketServer is a wrapper around SocketIO.Server that OTServer knows how to use.
// The hope is that later I'll be able to swap out socket.io for any other library
// that does the same thing and not have to change the logic in OTServer.
let socketServer: SocketServer = new SocketServer(socketIOServer);
let otServer: OTServer = new OTServer(socketServer);

// Add a handler on the socket.io server so that each new connection is funneled
// to the OT server.
socketIOServer.on('connection', (socket_: SocketIO.Socket) => {
  connectServerSocket(otServer, socket_);
});


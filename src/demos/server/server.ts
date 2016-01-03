/// <reference path='../../pbot/messages.ts' />
/// <reference path='../../pbot/ot_server.ts' />
/// <reference path='../../pbot/typings/node/node.d.ts' />
/// <reference path='../../pbot/typings/ws/ws.d.ts' />

let ws = require('ws');
let WebSocketServer = ws.Server;

var express = require('express');
let url = require('url');
var app = express();
var httpServer = require('http').Server(app);
let port = 3000;

// Serve data out of /static.
app.use(express.static(__dirname + '/static'));

app.get('/', function (req: any, res: any) {
  res.writeHead(302, {
    'Location': '/html/index.html'
  });
  res.end();
});

// When a user visits the server at /, direct them to a new collaborative document
// with a random documentId
app.get('/newTextDocument', function (req: any, res: any) {
  res.writeHead(302, {
    'Location': '/html/textDemo/index.html?documentId=' + Base.randomString(6, Base.ALPHA_NUMERIC)
  });
  res.end();
});

httpServer.listen(port, function () { console.log('listening on *:' + port); });

let wss = new WebSocketServer({ server: httpServer });

// SocketServer is a wrapper around SocketIO.Server that OTServer knows how to use.
// The hope is that later I'll be able to swap out socket.io for any other library
// that does the same thing and not have to change the logic in OTServer.
let otServer: OTServer = new OTServer();

// Add a handler on the socket.io server so that each new connection is funneled
// to the OT server.
wss.on('connection', (ws: any) => {
  connectServerSocket(otServer, <IWebSocket>ws);
});


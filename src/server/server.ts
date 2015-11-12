/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../base/lang.ts' />

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Serve data out of /static
app.use(express.static(__dirname + '/../../'));

let siteIdGen = new IDGenerator();
let totalOrderingGen = new IDGenerator();

io.on('connection', function (socket) {
  let siteId = siteIdGen.next();

  // Give the client its siteId
  socket.emit('site_id', {siteId: siteId});

  // Tell the others that this client has connected
  io.emit('client_connected', {siteId: siteId})

  // msgData is a json-serialized list of operations
  socket.on('operation', function (operation) {
    operation.timestamp['totalOrderingId'] = totalOrderingGen.next();
    let msg = {'operation': operation};
    console.log('Broadcasting message: ', JSON.stringify(msg), '\n');
    io.emit('operation', msg);
  });
});

app.get('/', function (req, res) {
  res.writeHead(302, {
    'Location': '/build/www/static/html/collaborative-text-editor.html'
  });
  res.end();
});


http.listen(3000, function () {
  console.log('listening on *:3000');
});

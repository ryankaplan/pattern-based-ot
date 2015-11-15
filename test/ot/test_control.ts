/// <reference path='../typings/mocha.d.ts' />

/// <reference path='../../src/ot/control.ts' />
/// <reference path='../../src/ot/operation.ts' />
/// <reference path='../../src/ot/text.ts' />
/// <reference path='../../src/ot/ot_server.ts' />
/// <reference path='../../src/ot/messages.ts' />
/// <reference path='../../src/transport/socket_client_transport.ts' />

/// <reference path='mock_server.ts' />
/// <reference path='../test.ts' />

function setupTest(initialDocumentContent: string, documentId: string = 'docId') {
  let mockSocketServer = new MockSocketServer();
  let server = new OTServer(mockSocketServer);

  // TODO(ryan): factor this out since it's exactly our server code
  mockSocketServer.on('connection', (socket_: RawServerSocket) => {
    let socket = new OTSocketWrapper(socket_);

    socket.on('ready', function () {
      server.handleConnect(socket);
    });

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
  // END TODO

  let model1 = new TextOperationModel(initialDocumentContent);
  let rawSocket1 = new MockRawClientSocket(mockSocketServer);
  let clientSocket1 = new SocketClientTransport(rawSocket1);
  let client1 = new OTClient(clientSocket1, documentId, model1);
  client1.connect();

  let model2 = new TextOperationModel(initialDocumentContent);
  let rawSocket2 = new MockRawClientSocket(mockSocketServer);
  let clientSocket2 = new SocketClientTransport(rawSocket2);
  let client2 = new OTClient(clientSocket2, documentId, model2);
  client2.connect();

  return {
    socketServer: mockSocketServer,
    otServer: server,

    model1: model1,
    rawSocket1: rawSocket1,
    clientSocket1: clientSocket1,
    client1: client1,

    model2: model2,
    rawSocket2: rawSocket2,
    clientSocket2: clientSocket2,
    client2: client2
  };
}

describe('Pattern Based OT', () => {
  describe('Simple multi-client insert and delete', () => {
    it('should work TODO(ryan)', () => {
      let initialDocument = '';
      let env = setupTest(initialDocument);

      env.client1.handleLocalOp(TextOp.Insert('a', 0));
      env.client1.handleLocalOp(TextOp.Insert('b', 1));
      env.client1.handleLocalOp(TextOp.Insert('c', 2));
      env.client1.handleLocalOp(TextOp.Delete(0));

      assertEqual(env.model1.render(), 'bc');
      assertEqual(env.model2.render(), 'bc');

      env.client2.handleLocalOp(TextOp.Insert('a', 1));
      env.client2.handleLocalOp(TextOp.Delete(0));

      assertEqual(env.model1.render(), 'ac');
      assertEqual(env.model2.render(), 'ac');
    });
  });

  describe('Single client offline then resolve', () => {
    it('should work TODO(ryan)', () => {
      var initialDocument = '';
      let env = setupTest(initialDocument);

      // Start queueing operations for site id 2
      env.rawSocket2.setIsQueueingReceives(true);

      // Client one types abc then deletes a
      env.client1.handleLocalOp(TextOp.Insert('a', 0));
      env.client1.handleLocalOp(TextOp.Insert('b', 1));
      env.client1.handleLocalOp(TextOp.Insert('c', 2));
      env.client1.handleLocalOp(TextOp.Delete(0));

      assertEqual(env.model1.render(), 'bc', 'model1 should have executed all local ops');
      assertEqual(env.model2.render(), '', 'model2 shouldn\'t have executed anything');

      // Client two types xyz
      env.client2.handleLocalOp(TextOp.Insert('x', 0));
      env.client2.handleLocalOp(TextOp.Insert('y', 1));
      env.client2.handleLocalOp(TextOp.Insert('z', 2));

      assertEqual(env.model1.render(), 'bcxyz', 'model1 should have executed all ops since it\'s online');
      assertEqual(env.model2.render(), 'xyz', 'model2 should have executed only local ops since it\'s offline');

      // Stop queueing, they should sync back up
      env.rawSocket2.setIsQueueingReceives(false);
      assertEqual(env.model2.render(), 'bcxyz', 'model2 should match model 1 now that it\'s back online');
    });
  });

  /*
  describe('Two clients offline then resolve', () => {
    it('should work TODO(ryan)', () => {
      var initialDocument = '';
      let env = setupTest(initialDocument);

      // Start queueing operations for site id 2
      env.rawSocket1.setIsQueueingReceives(true);
      env.rawSocket2.setIsQueueingReceives(true);

      // Client one types abc then deletes a
      env.client1.handleLocalOp(TextOp.Insert('a', 0));
      env.client1.handleLocalOp(TextOp.Insert('b', 1));
      env.client1.handleLocalOp(TextOp.Insert('c', 2));
      env.client1.handleLocalOp(TextOp.Delete(0));

      // Client two types xyz
      env.client2.handleLocalOp(TextOp.Insert('x', 0));
      env.client2.handleLocalOp(TextOp.Insert('y', 1));
      env.client2.handleLocalOp(TextOp.Insert('z', 2));

      assertEqual(env.model1.render(), 'bc');
      assertEqual(env.model2.render(), 'xyz');

      // Stop queueing, they should sync back up
      env.rawSocket1.setIsQueueingReceives(false);
      env.rawSocket2.setIsQueueingReceives(false);

      assertEqual(env.model1.render(), 'bcxyz', 'check model 1');
      assertEqual(env.model2.render(), 'bcxyz', 'check model 2');
    });
  });
  */
});

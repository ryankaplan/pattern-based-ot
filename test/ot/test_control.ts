/// <reference path='../typings/mocha.d.ts' />

/// <reference path='../../src/pbot/control.ts' />
/// <reference path='../../src/pbot/operation.ts' />
/// <reference path='../../src/pbot/char/model.ts' />
/// <reference path='../../src/pbot/ot_server.ts' />
/// <reference path='../../src/pbot/messages.ts' />
/// <reference path='../../src/pbot/socket_client_transport.ts' />

/// <reference path='mock_server.ts' />
/// <reference path='../test.ts' />

interface TestClient {
  model: Char.Model;
  rawSocket: MockRawClientSocket;
  clientSocket: SocketClientTransport;
  ot: OTClient;
}

function setupTest(initialDocumentContent: string, documentId: string, numClients: number) {
  let mockSocketServer = new MockSocketServer();
  let mockServer = new OTServer();
  mockSocketServer.on('connection', (socket_: IWebSocket) => {
    connectServerSocket(mockServer, socket_);
  });

  let clients: Array<any> = [];

  for (let i = 0; i < numClients; i++) {
    let model = new Char.Model(initialDocumentContent);
    let rawSocket = new MockRawClientSocket(mockSocketServer);
    let clientSocket = new SocketClientTransport(rawSocket);
    let client = new OTClient(clientSocket, documentId, model);
    client.connect();

    clients.push({
      model: model,
      rawSocket: rawSocket,
      clientSocket: clientSocket,
      ot: client
    });
  }

  return clients;
}

describe('Pattern Based OT', () => {
  describe('Simple multi-client insert and delete', () => {
    it('should work TODO(ryan)', () => {
      let initialDocument = '';
      let clients = setupTest(initialDocument, 'docId', 2);

      clients[0].ot.handleLocalOp(Char.Operation.Insert('a', 0));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('b', 1));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('c', 2));
      clients[0].ot.handleLocalOp(Char.Operation.Delete(0));

      assertEqual(clients[0].model.render(), 'bc');
      assertEqual(clients[1].model.render(), 'bc');

      clients[1].ot.handleLocalOp(Char.Operation.Insert('a', 1));
      clients[1].ot.handleLocalOp(Char.Operation.Delete(0));

      assertEqual(clients[0].model.render(), 'ac');
      assertEqual(clients[1].model.render(), 'ac');
    });
  });

  describe('Single client offline then resolve', () => {
    it('should work TODO(ryan)', () => {
      var initialDocument = '';
      let clients = setupTest(initialDocument, 'docId', 2);

      // Start queueing operations for site id 2
      clients[1].rawSocket.setIsQueueingReceives(true);

      // Client one types abc then deletes a
      clients[0].ot.handleLocalOp(Char.Operation.Insert('a', 0));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('b', 1));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('c', 2));
      clients[0].ot.handleLocalOp(Char.Operation.Delete(0));

      assertEqual(clients[0].model.render(), 'bc', 'model1 should have executed all local ops');
      assertEqual(clients[1].model.render(), '', 'model2 shouldn\'t have executed anything');

      // Client two types xyz
      clients[1].ot.handleLocalOp(Char.Operation.Insert('x', 0));
      clients[1].ot.handleLocalOp(Char.Operation.Insert('y', 1));
      clients[1].ot.handleLocalOp(Char.Operation.Insert('z', 2));

      assertEqual(clients[0].model.render(), 'bcxyz', 'model1 should have executed all ops since it\'s online');
      assertEqual(clients[1].model.render(), 'xyz', 'model2 should have executed only local ops since it\'s offline');

      // Stop queueing, they should sync back up
      clients[1].rawSocket.setIsQueueingReceives(false);
      assertEqual(clients[1].model.render(), 'bcxyz', 'model2 should match model 1 now that it\'s back online');
    });
  });

  describe('Two clients offline then resolve', () => {
    it('should work TODO(ryan)', () => {
      var initialDocument = '';
      let clients = setupTest(initialDocument, 'docId', 2);

      // Start queueing operations for site id 2
      clients[0].rawSocket.setIsQueueingReceives(true);
      clients[1].rawSocket.setIsQueueingReceives(true);

      // Client one types abc then deletes a
      clients[0].ot.handleLocalOp(Char.Operation.Insert('a', 0));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('b', 1));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('c', 2));

      // Client two types xyz
      clients[1].ot.handleLocalOp(Char.Operation.Insert('x', 0));

      assertEqual(clients[0].model.render(), 'abc');
      assertEqual(clients[1].model.render(), 'x');

      // Stop queueing, they should sync back up
      clients[0].rawSocket.setIsQueueingReceives(false);
      clients[1].rawSocket.setIsQueueingReceives(false);

      assertEqual(clients[0].model.render(), 'abcx', 'check model 1');
      assertEqual(clients[1].model.render(), 'abcx', 'check model 2');
    });
  });

  describe('Simple test case with three clients', () => {
    it('should work TODO(ryan)', () => {
      var initialDocument = '';
      let clients = setupTest(initialDocument, 'docId', 3);

      clients[0].ot.handleLocalOp(Char.Operation.Insert('a', 0));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('b', 1));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('c', 2));
      clients[0].ot.handleLocalOp(Char.Operation.Delete(0));

      for (var i = 0; i < clients.length; i++) {
        assertEqual(clients[i].model.render(), 'bc', 'fail');
        clients[i].rawSocket.setIsQueueingReceives(true);
      }

      clients[0].ot.handleLocalOp(Char.Operation.Insert('q', 1));
      clients[0].ot.handleLocalOp(Char.Operation.Insert('r', 2));
      clients[0].ot.handleLocalOp(Char.Operation.Delete(1));

      assertEqual(clients[0].model.render(), 'brc', 'fail');

      clients[1].ot.handleLocalOp(Char.Operation.Delete(0));
      clients[1].ot.handleLocalOp(Char.Operation.Insert('a', 0));
      clients[1].ot.handleLocalOp(Char.Operation.Insert('b', 2));

      assertEqual(clients[1].model.render(), 'acb', 'fail');

      clients[2].ot.handleLocalOp(Char.Operation.Delete(0));
      clients[2].ot.handleLocalOp(Char.Operation.Delete(0));
      clients[2].ot.handleLocalOp(Char.Operation.Insert('n', 0));
      clients[2].ot.handleLocalOp(Char.Operation.Insert('o', 1));
      clients[2].ot.handleLocalOp(Char.Operation.Insert('m', 2));

      assertEqual(clients[2].model.render(), 'nom', 'fail');

      for (var i = 0; i < clients.length; i++) {
        clients[i].rawSocket.setIsQueueingReceives(false);
      }

      assertEqual(clients[0].model.render(), clients[1].model.render(), 'fail');
      assertEqual(clients[1].model.render(), clients[2].model.render(), 'fail');
    });
  });

});

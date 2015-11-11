/// <reference path='../typings/mocha.d.ts' />

/// <reference path='../../src/ot/control.ts' />
/// <reference path='../../src/ot/operation.ts' />
/// <reference path='../../src/ot/text.ts' />

/// <reference path='mock_server.ts' />
/// <reference path='../test.ts' />

describe('Pattern Based OT', () => {

    describe('Simple multi-client insert and delete', () => {
        it('should work TODO(ryan)', () => {
            var server = new MockServer();
            var startingDocument = '';

            var model1 = new TextOperationModel(startingDocument);
            var socket1 = new MockSocket(server);
            var client1 = new OTClient(socket1, socket1.connectImmediately(), model1);

            var model2 = new TextOperationModel(startingDocument);
            var socket2 = new MockSocket(server);
            var client2 = new OTClient(socket2, socket2.connectImmediately(), model2);

            client1.handleLocalOp(TextOp.Insert('a', 0));
            client1.handleLocalOp(TextOp.Insert('b', 1));
            client1.handleLocalOp(TextOp.Insert('c', 2));
            client1.handleLocalOp(TextOp.Delete(0));

            assertEqual(model1.render(), 'bc');
            assertEqual(model2.render(), 'bc');

            client2.handleLocalOp(TextOp.Insert('a', 1));
            client2.handleLocalOp(TextOp.Delete(0));

            assertEqual(model1.render(), 'ac');
            assertEqual(model2.render(), 'ac');
        });
    });

    describe('Single client offline then resolve', () => {
        it('should work TODO(ryan)', () => {
            var server = new MockServer();
            var startingDocument = '';

            var socket1 = new MockSocket(server);
            var model1 = new TextOperationModel(startingDocument);
            var client1 = new OTClient(socket1, socket1.connectImmediately(), model1);

            var socket2 = new MockSocket(server);
            var model2 = new TextOperationModel(startingDocument);
            var client2 = new OTClient(socket2, socket2.connectImmediately(), model2);

            // Start queueing operations for site id 2
            server.setSocketOffline(socket2, true);

            // Client one types abc then deletes a
            client1.handleLocalOp(TextOp.Insert('a', 0));
            client1.handleLocalOp(TextOp.Insert('b', 1));
            client1.handleLocalOp(TextOp.Insert('c', 2));
            client1.handleLocalOp(TextOp.Delete(0));

            assertEqual(model1.render(), 'bc');
            assertEqual(model2.render(), '');

            // Client two types xyz
            client2.handleLocalOp(TextOp.Insert('x', 0));
            client2.handleLocalOp(TextOp.Insert('y', 1));
            client2.handleLocalOp(TextOp.Insert('z', 2));

            assertEqual(model1.render(), 'bcxyz');
            assertEqual(model2.render(), 'xyz');

            // Stop queueing, they should sync back up
            server.setSocketOffline(socket2, false);
            assertEqual(model2.render(), 'bcxyz');
        });
    });

    describe('Two clients offline then resolve', () => {
        it('should work TODO(ryan)', () => {
            var server = new MockServer();
            var startingDocument = '';

            var socket1 = new MockSocket(server);
            var model1 = new TextOperationModel(startingDocument);
            var client1 = new OTClient(socket1, socket1.connectImmediately(), model1);

            var socket2 = new MockSocket(server);
            var model2 = new TextOperationModel(startingDocument);
            var client2 = new OTClient(socket2, socket2.connectImmediately(), model2);

            // Start queueing operations for site id 2
            server.setSocketOffline(socket1, true);
            server.setSocketOffline(socket2, true);

            // Client one types abc then deletes a
            client1.handleLocalOp(TextOp.Insert('a', 0));
            client1.handleLocalOp(TextOp.Insert('b', 1));
            client1.handleLocalOp(TextOp.Insert('c', 2));
            client1.handleLocalOp(TextOp.Delete(0));

            // Client two types xyz
            client2.handleLocalOp(TextOp.Insert('x', 0));
            client2.handleLocalOp(TextOp.Insert('y', 1));
            client2.handleLocalOp(TextOp.Insert('z', 2));

            assertEqual(model1.render(), 'bc');
            assertEqual(model2.render(), 'xyz');

            // Stop queueing, they should sync back up
            server.setSocketOffline(socket1, false);
            server.setSocketOffline(socket2, false);

            assertEqual(model1.render(), 'bcxyz');
            assertEqual(model2.render(), 'bcxyz');
        });
    });
});

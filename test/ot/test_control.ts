/// <reference path='../../src/ot/control.ts' />
/// <reference path='../../src/ot/text.ts' />

/// <reference path='../test.ts' />

class MockServer implements OTTransport {
    private _totalOrderingGen: IDGenerator = new IDGenerator();
    private _handleConnectBySiteId: { [siteId: number]: (siteId: number) => void } = {};
	private _callbackBySiteId: { [siteId: number]: (op: Operation) => void } = {};

	// The first maps tracks whether we're queueing ops for a particular site.
	// The second tracks all queues ops for that site.
	private _shouldQueueOpsForSiteId: { [siteId: number]: boolean } = {};
	private _queuedOpsForSiteId: { [siteId: number]: Array<Operation> } = {};

	broadcast(siteId: number, operation: Operation): void {
        // Copy to be realistic about memory sharing between sites.
        // TODO(ryan): serialize to JSON and back instead.
        var copy = new TextOp(null, null, null);
        copy.copy(<TextOp>operation);
        copy.timestamp().setTotalOrderingId(this._totalOrderingGen.next());

		debug('About to broadcast from siteId = (', siteId, ')');
		for (var otherSiteId in this._callbackBySiteId) {

			if (this.shouldQueueOp(otherSiteId)) {
				debug('Queueing op to siteId', otherSiteId);
				this.queueOp(otherSiteId, copy);
			} else {
				debug('Broadcasting to siteId', otherSiteId);
				this._callbackBySiteId[otherSiteId](copy);
			}
		}
	}

	connect(
        siteId: number,
        handleConnect: (siteId: number) => void,
        handleRemoteOp: (op: Operation) => void
    ): void {
		debug('Client with siteId = (' + siteId + ') is listening');
		this._callbackBySiteId[siteId] = handleRemoteOp;

        for (var otherSiteId in this._handleConnectBySiteId) {
            this._handleConnectBySiteId[otherSiteId](siteId);
        }

        this._handleConnectBySiteId[siteId] = handleConnect;
    }

	// Helpers for queueing ops for particular sites, to test timing

	public setSiteOffline(siteId: number, shouldQueue: boolean) {
		this._shouldQueueOpsForSiteId[siteId] = shouldQueue;

		if (!shouldQueue && this._queuedOpsForSiteId[siteId]) {
			// We've stopped queueing ops for this site. Flush!
			debug('Flushing ', this._queuedOpsForSiteId[siteId].length, ' to site ' , siteId);
			for (var op of this._queuedOpsForSiteId[siteId]) {
				this._callbackBySiteId[siteId](op);
			}
			this._queuedOpsForSiteId[siteId] = null;
		}
	}

	private shouldQueueOp(siteId: number) {
		if (!(siteId in this._shouldQueueOpsForSiteId)) {
			return false;
		}
		return this._shouldQueueOpsForSiteId[siteId];
	}

	private queueOp(siteId: number, op: Operation) {
		if (!(this._queuedOpsForSiteId[siteId])) {
			this._queuedOpsForSiteId[siteId] = [];
		}
		this._queuedOpsForSiteId[siteId].push(op);
	}
}

class TestPatternBasedOT extends TestSuite {

	constructor() {
		super();

		this.tests = [
			this.testSimpleMultiClientInsertDelete.bind(this),
			this.testSingleClientOfflineThenResolve.bind(this),
            this.testTwoClientsOfflineThenResolve.bind(this)
		];
	}

	testSimpleMultiClientInsertDelete() {
		var transport = new MockServer();
		var startingDocument = '';
		var model1 = new TextOperationModel(startingDocument);
		var client1 = new OTClient(transport, 1, model1);
		var model2 = new TextOperationModel(startingDocument);
		var client2 = new OTClient(transport, 2, model2);

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
	}

	testSingleClientOfflineThenResolve() {
		var transport = new MockServer();
		var startingDocument = '';
		var model1 = new TextOperationModel(startingDocument);
		var client1 = new OTClient(transport, 1, model1);
		var model2 = new TextOperationModel(startingDocument);
		var client2 = new OTClient(transport, 2, model2);

		// Start queueing operations for site id 2
		transport.setSiteOffline(2, true);

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
		transport.setSiteOffline(2, false);
		assertEqual(model2.render(), 'bcxyz');
	}

    testTwoClientsOfflineThenResolve() {
        var transport = new MockServer();
        var startingDocument = '';
        var model1 = new TextOperationModel(startingDocument);
        var client1 = new OTClient(transport, 1, model1);
        var model2 = new TextOperationModel(startingDocument);
        var client2 = new OTClient(transport, 2, model2);

        // Start queueing operations for site id 2
        transport.setSiteOffline(1, true);
        transport.setSiteOffline(2, true);

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
        transport.setSiteOffline(1, false);
        transport.setSiteOffline(2, false);

        assertEqual(model1.render(), 'bcxyz');
        assertEqual(model2.render(), 'bcxyz');
    }
}

(new TestPatternBasedOT()).runTests();

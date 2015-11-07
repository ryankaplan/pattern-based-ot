/// <reference path='control.ts' />
/// <reference path='text.ts' />

class MockServer implements OTTransport {
	private _callbackBySiteId: { [siteId: number]: (op: Operation) => void } = {};

	broadcast(siteId: number, operation: Operation): void {
		for (var otherSiteId in this._callbackBySiteId) {
			if (otherSiteId !== siteId) {
				this._callbackBySiteId[otherSiteId](operation);
			}
		}
	}

	listen(siteId: number, callback: (op: Operation) => void): void {
		this._callbackBySiteId[siteId] = callback;
	}
}

function test() {
	var transport = new MockServer();

	var startingDocument = '';
	var client1 = new OTClient(transport, 1, new TextOperationModel(startingDocument));
	var client2 = new OTClient(transport, 2, new TextOperationModel(startingDocument));







}

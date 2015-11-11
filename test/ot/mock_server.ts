/// <reference path='../../src/base/lang.ts' />

/// <reference path='../../src/ot/operation.ts' />
/// <reference path='../../src/ot/text.ts' />


class MockServer {
    private _siteIdGen:IDGenerator = new IDGenerator();
    private _totalOrderingGen:IDGenerator = new IDGenerator();
    private _sockets: Array<MockSocket> = [];

    // The first map tracks whether we're queueing ops for a particular site.
    // The second tracks all queues ops for that site.
    private _shouldQueueOpsForSiteId:{ [siteId: number]: boolean } = {};
    private _queuedOpsForSiteId:{ [siteId: number]: Array<Operation> } = {};

    public clientConnect():number {
        return this._siteIdGen.next();
    }

    public clientListen(newSocket: MockSocket):void {
        for (var socket of this._sockets) {
            socket.handleConnect(newSocket.siteId());
        }
        this._sockets.push(newSocket);
    }

    public clientBroadcast(op: Operation) {
        // Copy to be realistic about memory sharing between sites.
        // TODO(ryan): serialize back and forth to json instead
        let copy = new TextOp(null, null, null);
        copy.copy(<TextOp>op);
        copy.timestamp().setTotalOrderingId(this._totalOrderingGen.next());

        for (var socket of this._sockets) {
            if (this.shouldQueueOp(socket)) {
                debug('Queueing op to siteId', socket.siteId());
                this.queueOp(socket, copy);
            } else {
                debug('Broadcasting to siteId', socket.siteId());
                socket.handleRemoteOp(copy);
            }
        }
    }

    // Helpers for queueing ops for particular sites, to test timing
    public setSocketOffline(socket: MockSocket, shouldQueue:boolean) {
        this._shouldQueueOpsForSiteId[socket.siteId()] = shouldQueue;

        let queuedOps = this._queuedOpsForSiteId[socket.siteId()];
        if (!shouldQueue && queuedOps) {
            // We've stopped queueing ops for this site. Flush!
            debug('Flushing ', queuedOps.length, ' to site ', socket.siteId());
            for (var op of queuedOps) {
                socket.handleRemoteOp(op);
            }
            this._queuedOpsForSiteId[socket.siteId()] = [];
        }
    }

    private shouldQueueOp(socket: MockSocket) {
        if (!(socket.siteId() in this._shouldQueueOpsForSiteId)) {
            return false;
        }
        return this._shouldQueueOpsForSiteId[socket.siteId()];
    }

    private queueOp(socket: MockSocket, op:Operation) {
        if (!(this._queuedOpsForSiteId[socket.siteId()])) {
            this._queuedOpsForSiteId[socket.siteId()] = [];
        }
        this._queuedOpsForSiteId[socket.siteId()].push(op);
    }
}

class MockSocket implements OTTransport {
    private _siteId: number;
    private _handleConnect: (siteId: number) => void;
    private _handleRemoteOp: (op: Operation) => void;

    constructor(private _server: MockServer) {
    }

    // Called by server

    public siteId(): number {
        return this._siteId;
    }

    public handleConnect(siteId: number): void {
        this._handleConnect(siteId);
    }

    public handleRemoteOp(op: Operation): void {
        this._handleRemoteOp(op);
    }

    // Called by client

    public connectImmediately(): number {
        var num: number = null;
        this.connect((function (siteId: number) {
           num = siteId;
        }).bind(this));
        return num;
    }

    public connect(complete: (siteId: number) => void): void {
        this._siteId = this._server.clientConnect();
        complete(this._siteId);
    }

    public listenAsClient(
        handleConnect: (siteId: number) => void,
        handleRemoteOp: (op: Operation) => void
    ): void {
        assert(this._siteId !== null);
        this._handleRemoteOp = handleRemoteOp;
        this._handleConnect = handleConnect;
        this._server.clientListen(this);
    }

    public broadcast(operation: Operation): void {
        this._server.clientBroadcast(operation);
    }
}
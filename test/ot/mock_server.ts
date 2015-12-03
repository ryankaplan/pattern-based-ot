/// <reference path='../../src/base/lang.ts' />
/// <reference path='../../src/pbot/ot/operation.ts' />
/// <reference path='../../src/pbot/ot/ot_server.ts' />
/// <reference path='../../src/pbot/ot/text.ts' />


// TODO(ryan): MockSocketServer doesn't handle disconnects, but they're
// an important case to test.
class MockSocketServer implements OTSocketServer {
  private _callbackByEvent: { [evt: string]: (socket: any) => void } = {};
  private _connectedSockets: Array<MockRawServerSocket> = [];

  constructor() {}

  on(evt: string, callback: (socket: any) => void) {
    this._callbackByEvent[evt] = callback;
  }

  handleNewSocketConnection(serverSocket: MockRawServerSocket) {
    this._connectedSockets.push(serverSocket);
    this._callbackByEvent['connection'](serverSocket);
  }

  // Implement OTSocketServer
  send(channel: string, type: string, msg: any) {
    for (var socket of this._connectedSockets) {
      if (socket.channel() === channel) {
        socket.emit(type, msg);
      }
    }
  }
}

class MockRawServerSocket implements RawServerSocket {
  private _callbackByEvt: { [evt: string]: (obj: any) => void } = {};
  private _channel: string = null;
  private _clientSocket: MockRawClientSocket;

  // Helpers
  setClientSocket(clientSocket: MockRawClientSocket) { this._clientSocket = clientSocket; }
  channel(): string { return this._channel; }

  handleMessageFromClient(type: string, obj: any) {
    if (type in this._callbackByEvt) {
      this._callbackByEvt[type](obj);
    } else {
      infoLog('No callback found in MockRawServerSocket for type ' + type);
    }
  }

  // Implement RawServerSocket
  join(channel: string): void { this._channel = channel; }
  emit(type: string, obj: any): void { this._clientSocket.handleMessageFromServer(type, obj); }
  on(evt: string, func: (obj: any) => void): void { this._callbackByEvt[evt] = func; }
}

interface Message {
  type: string;
  value: any;
}

class MockRawClientSocket implements RawClientSocket {
  private _callbackByEvt: { [evt: string]: (obj: any) => void } = {};
  private _serverSocket: MockRawServerSocket;

  private _isQueueingSends: boolean = false;
  private _queuedSends: Array<Message> = [];

  private _isQueueingReceives: boolean = false;
  private _queuedReceives: Array<Message> = [];

  // Just like with a WebSocket it connects to the server as soon as you create
  // the object. I personally dislike this pattern.
  constructor(private _server: MockSocketServer) {
    this._serverSocket = new MockRawServerSocket();
    this._serverSocket.setClientSocket(this);
    this._server.handleNewSocketConnection(this._serverSocket);
  }

  setIsQueueingSends(isQueueing: boolean) {
    if (isQueueing === this._isQueueingSends) { return; }
    this._isQueueingSends = isQueueing;

    if (!isQueueing) {
      // flush sends
      for (var msg of this._queuedSends) {
        this._serverSocket.handleMessageFromClient(msg.type, msg.value);
      }
      this._queuedSends = [];
    }
  }

  setIsQueueingReceives(isQueueing: boolean) {
    if (isQueueing === this._isQueueingReceives) { return; }
    this._isQueueingReceives = isQueueing;

    if (isQueueing) {
      debugLog("MockRawClientSocket", "Start queuing ops");

    } else {
      // flush receives
      debugLog("MockRawClientSocket", 'FLUSHING ' + this._queuedReceives + ' ops');
      for (var msg of this._queuedReceives) {
        if (msg.type in this._callbackByEvt) {
          this._callbackByEvt[msg.type](msg.value);
        } else {
          fail('No callback found in MockRawClientSocket for type ' + msg.type);
        }
      }
      this._queuedReceives = [];
    }
  }

  handleMessageFromServer(type: string, obj: any) {
    if (this._isQueueingReceives) {
      this._queuedReceives.push({
        type: type,
        value: obj
      });
      return;
    }

    if (type in this._callbackByEvt) {
      this._callbackByEvt[type](obj);
    } else {
      fail('No callback found in MockRawClientSocket for type ' + type);
    }
  }

  // Used by client to send/receive from server
  on(evt: string, func: (val: any) => void) {
    this._callbackByEvt[evt] = func;
  }

  emit(type: string, obj: any) {
    if (this._isQueueingSends) {
      this._queuedSends.push({
        type: type,
        value: obj
      });
      return;
    }

    this._serverSocket.handleMessageFromClient(type, obj);
  }
}

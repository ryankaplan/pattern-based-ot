/// <reference path='../../src/base/lang.ts' />
/// <reference path='../../src/pbot/operation.ts' />
/// <reference path='../../src/pbot/ot_server.ts' />
/// <reference path='../../src/pbot/char/text_op.ts' />

// TODO(ryan): MockSocketServer doesn't handle disconnects, but they're
// an important case to test.
class MockSocketServer {
  private _callbackByEvent: { [evt: string]: (socket: any) => void } = {};
  constructor() {}
  on(evt: string, callback: (socket: any) => void) { this._callbackByEvent[evt] = callback; }
  handleNewSocketConnection(serverSocket: MockRawServerSocket) { this._callbackByEvent['connection'](serverSocket); }
}

class MockRawServerSocket implements IWebSocket {
  private _callbackByEvt: { [evt: string]: (obj: any) => void } = {};
  private _clientSocket: MockRawClientSocket;

  setClientSocket(clientSocket: MockRawClientSocket) {
    this._clientSocket = clientSocket;
  }

  handleMessageFromClient(data: string) {
    let type = 'message';
    if (type in this._callbackByEvt) {
      this._callbackByEvt[type](data);
    } else {
      infoLog('No callback found in MockRawServerSocket for type ' + type);
    }
  }

  // Implement IWebSocket
  onclose: (event: {wasClean: boolean; code: number; reason: string; target: IWebSocket}) => void = null;

  send(data: any, cb?: (err: Error) => void): void {
    this._clientSocket.handleMessageFromServer(data);
  }

  on(event: string, listener: (obj: any) => void): IWebSocket {
    this._callbackByEvt[event] = listener;
    return this;
  }
}

class MockRawClientSocket implements WebSocket {
  private _serverSocket: MockRawServerSocket;

  private _isQueueingSends: boolean = false;
  private _queuedSends: Array<string> = [];

  private _isQueueingReceives: boolean = false;
  private _queuedReceives: Array<string> = [];

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
      for (var data of this._queuedSends) {
        this._serverSocket.handleMessageFromClient(data);
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
      for (var data of this._queuedReceives) {

        if (this.onmessage !== null) {
          this.onmessage(<MessageEvent>{
            data: data
          });
        } else {
          fail('onmessage is null on WebSocket instance');
        }
      }
      this._queuedReceives = [];
    }
  }

  handleMessageFromServer(data: any) {
    if (this._isQueueingReceives) {
      this._queuedReceives.push(data);
    } else {
      if (this.onmessage !== null) {
        this.onmessage(<MessageEvent>{
          data: data
        });
      } else {
        fail('onmessage is null on WebSocket instance');
      }
    }
  }

  // Implement WebSocket
  binaryType: string;
  bufferedAmount: number;
  extensions: string;
  onclose: (ev: CloseEvent) => any;
  onerror: (ev: Event) => any;
  onmessage: (ev: MessageEvent) => any;
  onopen: (ev: Event) => any;
  protocol: string;
  readyState: number = 1; // OPEN
  url: string;
  close(code?: number, reason?: string): void {}
  send(data: any): void {
    if (typeof data !== 'string') {
      fail('Unexpected type passed to send!');
    }

    if (this._isQueueingSends) {
      this._queuedSends.push(data);
    } else {
      this._serverSocket.handleMessageFromClient(data);
    }
  }
  CLOSED: number;
  CLOSING: number;
  CONNECTING: number;
  OPEN: number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void {}

  // Implement EventTarget
  dispatchEvent(evt: Event): boolean { return false; }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void {}
}

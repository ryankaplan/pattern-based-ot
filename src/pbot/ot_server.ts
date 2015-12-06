/// <reference path='messages.ts' />
/// <reference path='operation.ts' />
/// <reference path='../base/lang.ts' />
/// <reference path='../base/list.ts' />
/// <reference path='typings/ws/ws.d.ts' />

// Minimal interface for socket/socket server that needs to be implemented
// to work with OTServer
interface IWebSocket {
  onclose: (event: {wasClean: boolean; code: number; reason: string; target: IWebSocket}) => void;
  send(data: any, cb?: (err: Error) => void): void;
  on(event: string, listener: (obj: any) => void): IWebSocket;
}

// Wraps RawServerSocket with a siteId and documentId
class OTSocketWrapper {
  private _siteId: string;
  private _documentId: string;
  constructor(private _socket: IWebSocket) { }

  documentId(): string { return this._documentId; }
  setDocumentId(documentId: string): void { this._documentId = documentId; }
  siteId(): string { return this._siteId; }
  setSiteId(siteId: string): void { this._siteId = siteId; }

  send(message: string) { this._socket.send(message); }
  on(evt: string, func: (obj: any) => void) {
    if (evt == "disconnect") {
      this._socket.onclose = func;
      return;
    }

    this._socket.on(evt, func);
  }
}

function connectServerSocket(otServer: OTServer, rawSocket: IWebSocket) {
  let socket = new OTSocketWrapper(rawSocket);

  socket.on('message', function (msg: string) {
    let rawMsg: OTMessage = JSON.parse(msg);
    switch (rawMsg.type.value) {
      case MessageType.CLIENT_IS_READY.value:
        otServer.handleReady(socket);
        break;

      case MessageType.DOCUMENT_CONNECT.value:
        otServer.handleDocumentConnectMessage(socket, <DocumentConnectMessage>rawMsg);
        break;

      case MessageType.OPERATION.value:
        otServer.handleOperationMessage(socket, <OperationMessage>rawMsg);
        break;

      case MessageType.DOCUMENT_CONNECTIONS.value:
      case MessageType.SITE_ID.value:
      case MessageType.INITIAL_LOAD_BEGIN.value:
      case MessageType.INITIAL_LOAD_END.value:
        fail('Unexpected message on server');
        break;
    }
  });

  socket.on('disconnect', function () {
    otServer.handleDisconnect(socket);
  });
}

class OpenDocumentState {
  private _docId: string;
  private _toGen = new Base.IDGenerator();
  private _connectedSites: Array<OTSocketWrapper> = [];
  private _messageHistory: Array<OTMessage> = [];

  // const functions
  docId(): string { return this._docId; }
  connectedSites(): Array<OTSocketWrapper> { return this._connectedSites; }
  connectedSiteIds(): Array<string> {
    let siteIds: Array<string> = [];
    for (var site of this._connectedSites) {
      siteIds.push(site.siteId());
    }
    return siteIds;
  }
  messages(): Array<OTMessage> { return this._messageHistory; }

  // non-const functions
  nextTotalOrderingId(): number { return this._toGen.next(); }
  addConnectedSite(socket: OTSocketWrapper) { addElementIfMissing(this._connectedSites, socket); }
  removeConnectedSite(socket: OTSocketWrapper) { removeElement(this._connectedSites, socket); }
  appendMessage(msg: OTMessage) { this._messageHistory.push(msg); }
}

class OTServer {
  private _siteIdGen = new Base.IDGenerator();
  private _docStateById: { [docId: string]: OpenDocumentState } = {};

  private docStateForId(documentId: string): OpenDocumentState {
    if (!(documentId in this._docStateById)) {
      this._docStateById[documentId] = new OpenDocumentState();
    }
    return this._docStateById[documentId];
  }

  handleReady(socket: OTSocketWrapper): void {
    socket.setSiteId('' + this._siteIdGen.next());
    debugLog('Server', 'handleConnect', JSON.stringify(socket.siteId()));
    socket.send(JSON.stringify(new SiteIdMessage(socket.siteId())));
  }

  handleDisconnect(socket: OTSocketWrapper): void {
    debugLog('Server', 'handleDisconnect', JSON.stringify(socket.siteId()));
    this.docStateForId(socket.documentId()).removeConnectedSite(socket);
  }

  handleDocumentConnectMessage(socket: OTSocketWrapper, msg: DocumentConnectMessage) {
    debugLog('Server', 'handleDocumentConnectMessage', JSON.stringify(socket.siteId()), JSON.stringify(msg));
    socket.setDocumentId(msg.documentId);
    let docState = this.docStateForId(socket.documentId());

    docState.addConnectedSite(socket);

    // First send down every message ever sent to this open document.
    //
    // TODO(ryan): This is a potentially expensive operation that blocks us from responding
    // to other clients. We should use an Ajax request to do this since it doesn't even need
    // to hit the same server at websocket messages.
    socket.send(JSON.stringify(new OTMessage(MessageType.INITIAL_LOAD_BEGIN)));
    for (var message of docState.messages()) {
      socket.send(JSON.stringify(message));
    }
    socket.send(JSON.stringify(new OTMessage(MessageType.INITIAL_LOAD_END)));

    let siteIds = docState.connectedSiteIds();
    let dcMessage = new DocumentConnectionsMessage(siteIds);
    docState.appendMessage(dcMessage);
    this.broadcast(socket.documentId(), JSON.stringify(dcMessage));
  }

  handleOperationMessage(socket: OTSocketWrapper, msg: OperationMessage) {
    debugLog('-');
    debugLog('Server : siteId = ' + socket.siteId(), 'handleOperationMessage', JSON.stringify(msg));
    assert(socket.siteId() !== null);
    assert(socket.documentId() !== null);

    // Broadcast to all clients connected to the same document
    let docState = this.docStateForId(socket.documentId());
    msg.jsonOp.timestamp['totalOrderingId'] = docState.nextTotalOrderingId();
    docState.appendMessage(msg);
    this.broadcast(socket.documentId(), JSON.stringify(msg));
  }

  broadcast(documentId: string, message: string) {
    for (var socket of this.docStateForId(documentId).connectedSites()) {
      socket.send(message);
    }
  }
}
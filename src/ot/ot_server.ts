/// <reference path='messages.ts' />
/// <reference path='operation.ts' />
/// <reference path='../base/lang.ts' />
/// <reference path='../base/list.ts' />

interface RawServerSocket {
  // joins a channel. can join one at a time.
  // not to be used by the client
  join(channel: string): void;

  // send a message to this socket.
  emit(type: string, obj: any): void;

  // listen for messages from this socket.
  on(evt: string, func: (obj: any) => void): void;
}

interface OTSocketServer {
  send(channel: string, type: string, msg: any): void;
}

// Wraps RawServerSocket with a siteId and documentId
class OTSocketWrapper {
  private _siteId: string;
  private _documentId: string;
  constructor(private _socket: RawServerSocket) { }

  documentId(): string { return this._documentId; }
  setDocumentId(documentId: string): void { this._documentId = documentId; }
  siteId(): string { return this._siteId; }
  setSiteId(siteId: string): void { this._siteId = siteId; }

  join(room: string) { this._socket.join(room); }
  emit(type: string, obj: any) { this._socket.emit(type, obj); }
  on(evt: string, func: (obj: any) => void) { this._socket.on(evt, func); }
}

function connectServerSocket(otServer: OTServer, rawSocket: RawServerSocket) {
  let socket = new OTSocketWrapper(rawSocket);

  socket.on('message', function (rawMsg: OTMessage) {
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
  private _toGen = new IDGenerator();
  private _connectedSites: Array<string> = [];
  private _messageHistory: Array<OTMessage> = [];

  // const functions
  docId(): string { return this._docId; }
  connectedSites(): Array<string> { return this._connectedSites; }
  messages(): Array<OTMessage> { return this._messageHistory; }

  // non-const functions
  nextTotalOrderingId(): number { return this._toGen.next(); }
  addConnectedSite(siteId: string) { addElementIfMissing(this._connectedSites, siteId); }
  removeConnectedSite(siteId: string) { removeElement(this._connectedSites, siteId); }
  appendMessage(msg: OTMessage) { this._messageHistory.push(msg); }
}

class OTServer {
  private _siteIdGen = new IDGenerator();
  private _docStateById: { [docId: string]: OpenDocumentState } = {};

  constructor(private _io: OTSocketServer) {}

  private docStateForId(documentId: string): OpenDocumentState {
    if (!(documentId in this._docStateById)) {
      this._docStateById[documentId] = new OpenDocumentState();
    }
    return this._docStateById[documentId];
  }

  handleReady(socket: OTSocketWrapper): void {
    socket.setSiteId('' + this._siteIdGen.next());
    debugLog('Server', 'handleConnect', JSON.stringify(socket.siteId()));
    socket.emit('message', new SiteIdMessage(socket.siteId()));
  }

  handleDisconnect(socket: OTSocketWrapper): void {
    debugLog('Server', 'handleDisconnect', JSON.stringify(socket.siteId()));
    let documentId = socket.documentId();
    if (documentId !== null) {
      this.docStateForId(socket.documentId()).removeConnectedSite(socket.siteId());
    }
  }

  handleDocumentConnectMessage(socket: OTSocketWrapper, msg: DocumentConnectMessage) {
    debugLog('Server', 'handleDocumentConnectMessage', JSON.stringify(socket.siteId()), JSON.stringify(msg));
    socket.setDocumentId(msg.documentId);
    socket.join(socket.documentId());
    let docState = this.docStateForId(socket.documentId());

    docState.addConnectedSite(socket.siteId());

    // First send down every message ever sent to this open document.
    //
    // TODO(ryan): This is a potentially expensive operation that blocks us from responding
    // to other clients. We should use an Ajax request to do this since it doesn't even need
    // to hit the same server at websocket messages.
    socket.emit('message', new OTMessage(MessageType.INITIAL_LOAD_BEGIN));
    for (var message of docState.messages()) {
      socket.emit('message', message);
    }
    socket.emit('message', new OTMessage(MessageType.INITIAL_LOAD_END));

    let dcMessage = new DocumentConnectionsMessage(docState.connectedSites());
    docState.appendMessage(dcMessage);
    this._io.send(socket.documentId(), 'message', dcMessage);
  }

  handleOperationMessage(socket: OTSocketWrapper, msg: OperationMessage) {
    debugLog('-');
    debugLog('Server : siteId = ' + socket.siteId(), 'handleOperationMessage', JSON.stringify(msg));
    assert(socket.siteId() !== null);
    assert(socket.documentId() !== null);

    // Forward the message along ot other clients in the room
    let docState = this.docStateForId(socket.documentId());
    msg.jsonOp.timestamp['totalOrderingId'] = docState.nextTotalOrderingId();
    docState.appendMessage(msg);
    this._io.send(socket.documentId(), 'message', msg);
  }
}
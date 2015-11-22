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
  private _siteId: number;
  private _documentId: string;
  constructor(private _socket: RawServerSocket) { }

  documentId(): string { return this._documentId; }
  setDocumentId(documentId: string): void { this._documentId = documentId; }
  siteId(): number { return this._siteId; }
  setSiteId(siteId: number): void { this._siteId = siteId; }

  join(room: string) { this._socket.join(room); }
  emit(type: string, obj: any) { this._socket.emit(type, obj); }
  on(evt: string, func: (obj: any) => void) { this._socket.on(evt, func); }
}

function connectServerSocket(otServer: OTServer, rawSocket: RawServerSocket) {
  let socket = new OTSocketWrapper(rawSocket);

  socket.on('ready', function () {
    otServer.handleReady(socket);
  });

  socket.on('disconnect', function () {
    otServer.handleDisconnect(socket);
  });

  socket.on('document_connect', function (msg: DocumentConnectMessage) {
    otServer.handleDocumentConnectMessage(socket, msg);
  });

  socket.on('operation', function (msg: OperationMessage) {
    otServer.handleOperationMessage(socket, msg);
  });
}

class OpenDocumentState {
  private _docId: string;
  private _toGen = new IDGenerator();
  private _connectedSites: Array<number> = [];
  private _messageHistory: Array<IMessage> = [];

  // const functions
  docId(): string { return this._docId; }
  connectedSites(): Array<number> { return this._connectedSites; }
  messages(): Array<IMessage> { return this._messageHistory; }

  // non-const functions
  nextTotalOrderingId(): number { return this._toGen.next(); }
  addConnectedSite(siteId: number) { addElementIfMissing(this._connectedSites, siteId); }
  removeConnectedSite(siteId: number) { removeElement(this._connectedSites, siteId); }
  appendMessage(msg: IMessage) { this._messageHistory.push(msg); }
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
    socket.setSiteId(this._siteIdGen.next());
    debugLog('Server', 'handleConnect', JSON.stringify(socket.siteId()));
    socket.emit('site_id', new SiteIdMessage(socket.siteId()));
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
    socket.emit(MessageType.INITIAL_LOAD_BEGIN.value, null);
    for (var message of docState.messages()) {
      socket.emit(message.type.value, message);
    }
    socket.emit(MessageType.INITIAL_LOAD_END.value, null);

    let dcMessage = new DocumentConnectionsMessage(docState.connectedSites());
    docState.appendMessage(dcMessage);
    this._io.send(socket.documentId(), 'document_connections', dcMessage);
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
    this._io.send(socket.documentId(), 'operation', msg);
  }
}
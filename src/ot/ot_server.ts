/// <reference path='messages.ts' />
/// <reference path='operation.ts' />
/// <reference path='../base/lang.ts' />
/// <reference path='../base/list.ts' />

interface OTSocket {
  // joins a channel. can join one at a time.
  join(channel: string): void;

  // send a message to this socket.
  emit(type: string, obj: any): void;

  // listen for messages from this socket.
  on(evt: string, func: (obj: any) => void): void;
}

interface OTSocketServer {
  send(channel: string, type: string, msg: any): void;
}

// Wraps OTSocket with a siteId and documentId
class OTSocketWrapper {
  private _siteId: number;
  private _documentId: string;
  constructor(private _socket: OTSocket) { }

  documentId(): string { return this._documentId; }
  setDocumentId(documentId: string): void { this._documentId = documentId; }
  siteId(): number { return this._siteId; }
  setSiteId(siteId: number): void { this._siteId = siteId; }

  join(room: string) { this._socket.join(room); }
  emit(type: string, obj: any) { this._socket.emit(type, obj); }
  on(evt: string, func: (obj: any) => void) { this._socket.on(evt, func); }
}

class OTServer {
  private _siteIdGen = new IDGenerator();
  private _totalOrderingGen = new IDGenerator();
  private _sitesByDocumentId: { [documentId: string]: Array<number> } = {};

  constructor(private _io: OTSocketServer) {}

  private sitesForDocumentId(documentId: string): Array<number> {
    if (!(documentId in this._sitesByDocumentId)) {
      this._sitesByDocumentId[documentId] = [];
    }
    return this._sitesByDocumentId[documentId];
  }

  handleConnect(socket: OTSocketWrapper): void {
    socket.setSiteId(this._siteIdGen.next());
    console.log('handleConnect', JSON.stringify(socket.siteId()));
    socket.emit('site_id', { siteId: socket.siteId() });
  }

  handleDisconnect(socket: OTSocketWrapper): void {
    console.log('handleDisconnect', JSON.stringify(socket.siteId()));
    let documentId = socket.documentId();
    if (documentId !== null && documentId in this._sitesByDocumentId) {
      removeElement(this._sitesByDocumentId[documentId], documentId);
    }
  }

  handleDocumentConnectMessage(socket: OTSocketWrapper, msg: DocumentConnectMessage) {
    console.log('handleDocumentConnectMessage', JSON.stringify(socket.siteId()), JSON.stringify(msg));

    socket.setDocumentId(msg.documentId);
    socket.join(socket.documentId());

    // TODO(ryan): verify that it's not in here already
    this.sitesForDocumentId(socket.documentId()).push(socket.siteId());

    this._io.send(socket.documentId(), 'document_connections', {
      connectedSites: this.sitesForDocumentId(socket.documentId())
    });
  }

  handleOperationMessage(socket: OTSocketWrapper, msg: OperationMessage) {
    console.log('handleOperationMessage', JSON.stringify(socket.siteId()), JSON.stringify(msg));
    assert(socket.siteId() !== null);
    assert(socket.documentId() !== null);

    // Forward the message along ot other clients in the room
    msg.operation.timestamp['totalOrderingId'] = this._totalOrderingGen.next();
    this._io.send(socket.documentId(), 'operation', msg);
  }
}
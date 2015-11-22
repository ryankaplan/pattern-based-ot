/// <reference path='../base/logging.ts' />
/// <reference path='../ot/control.ts' />
/// <reference path='../ot/messages.ts' />
/// <reference path='../ot/text.ts' />

interface RawClientSocket {
  on(evt: string, func: (val: any) => void): void;
  emit(evt: string, obj: any): void;
}

// Used by the client
class SocketClientTransport implements OTClientTransport {
  private _siteId: number = null;

  // TODO(ryan): type this better
  constructor(private _socket: RawClientSocket) {}

  connect(
    documentId: string,

    // handleSiteId will always be called before the first call to handleConnectedClients
    // which will always be called before the first call to handleRemoteOp
    handleSiteId: (siteId: number) => void,
    handleConnectedClients:(connectedClients: Array<number>) => void,
    handleRemoteOp: (op: Operation) => void,
    handleInitialLoadBegin: () => void,
    handleInitialLoadEnd: () => void
  ): void {

    this._socket.on('message', (rawMsg: OTMessage) => {
      switch (rawMsg.type) {
        case MessageType.SITE_ID:
          // First the server will send us our site id
          let siteIdMessage = <SiteIdMessage>rawMsg;
          this._siteId = siteIdMessage.siteId;
          handleSiteId(siteIdMessage.siteId);
          this._socket.emit('message', new DocumentConnectMessage(documentId));
          break;

        case MessageType.CLIENT_IS_READY:
        case MessageType.DOCUMENT_CONNECT:
        case MessageType.INITIAL_LOAD_BEGIN:
          handleInitialLoadBegin();
          break;

        case MessageType.INITIAL_LOAD_END:
          handleInitialLoadEnd();
          break;

        case MessageType.DOCUMENT_CONNECTIONS:
          // Then it will tell us who else is connected on this document.
          // This will also be called every time someone new joins.
          let dcMessage = <DocumentConnectionsMessage>rawMsg;
          if (dcMessage.connectedSites.indexOf(this._siteId) === -1) { fail('Server thinks we\'re not in this document'); }
          handleConnectedClients(dcMessage.connectedSites);
          break;

        case MessageType.OPERATION:
          // We'll get operation notifications whenever someone in this room
          // broadcasts.
          let msg = <OperationMessage>rawMsg;
          let textOp = new TextOp(null, null, null);
          textOp.initWithJson(msg.jsonOp);
          handleRemoteOp(textOp);
          break;
      }
    });

    // Tell the server to give us our siteId
    this._socket.emit('message', new OTMessage(MessageType.CLIENT_IS_READY));
  }

  // Send an operation to all other sites
  public broadcastOperation(operation: Operation):void {
    let jsonOp = {};
    operation.fillJson(jsonOp);
    this._socket.emit('message', new OperationMessage(jsonOp));
  }
}
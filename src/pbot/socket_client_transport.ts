/// <reference path='../base/logging.ts' />
/// <reference path='ot/control.ts' />
/// <reference path='ot/messages.ts' />
/// <reference path='ot/text.ts' />

// Used by the client
class SocketClientTransport implements OTClientTransport {
  private _siteId: string = null;

  constructor(private _socket: WebSocket) {}

  connect(
    documentId: string,

    // handleSiteId will always be called before the first call to handleConnectedClients
    // which will always be called before the first call to handleRemoteOp
    handleSiteId: (siteId: string) => void,
    handleConnectedClients:(connectedClients: Array<string>) => void,
    handleRemoteOp: (op: Operation) => void,
    handleInitialLoadBegin: () => void,
    handleInitialLoadEnd: () => void
  ): void {

    this._socket.onmessage = (evt: any) => {
      var obj = JSON.parse(evt.data);
      let rawMsg: OTMessage = <OTMessage>obj;
      switch (rawMsg.type.value) {
        case MessageType.SITE_ID.value:
          // First the server will send us our site id
          let siteIdMessage = <SiteIdMessage>rawMsg;
          this._siteId = siteIdMessage.siteId;
          handleSiteId(siteIdMessage.siteId);
          this._socket.send(JSON.stringify(new DocumentConnectMessage(documentId)));
          break;

        case MessageType.CLIENT_IS_READY.value:
        case MessageType.DOCUMENT_CONNECT.value:
        case MessageType.INITIAL_LOAD_BEGIN.value:
          handleInitialLoadBegin();
          break;

        case MessageType.INITIAL_LOAD_END.value:
          handleInitialLoadEnd();
          break;

        case MessageType.DOCUMENT_CONNECTIONS.value:
          // Then it will tell us who else is connected on this document.
          // This will also be called every time someone new joins.
          let dcMessage = <DocumentConnectionsMessage>rawMsg;
          if (dcMessage.connectedSites.indexOf(this._siteId) === -1) { fail('Server thinks we\'re not in this document'); }
          handleConnectedClients(dcMessage.connectedSites);
          break;

        case MessageType.OPERATION.value:
          // We'll get operation notifications whenever someone in this room
          // broadcasts.
          let msg = <OperationMessage>rawMsg;
          let textOp = new TextOp(null, null, null);
          textOp.initWithJson(msg.jsonOp);
          handleRemoteOp(textOp);
          break;
      }
    };

    this._socket.onopen = () => {
      console.log('Socket opened!');
      this._socket.send(JSON.stringify(new OTMessage(MessageType.CLIENT_IS_READY)));
    };
  }

  // Send an operation to all other sites
  public broadcastOperation(operation: Operation):void {
    let jsonOp = {};
    operation.fillJson(jsonOp);
    this._socket.send(JSON.stringify(new OperationMessage(jsonOp)));
  }
}
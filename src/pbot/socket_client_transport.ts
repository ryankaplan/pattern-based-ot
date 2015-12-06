/// <reference path='../base/logging.ts' />
/// <reference path='control.ts' />
/// <reference path='messages.ts' />
/// <reference path='text_op.ts' />

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
    handleRemoteOp: (op: OperationBase.Operation) => void,
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

    let onopen = () => {
      this._socket.send(JSON.stringify(new OTMessage(MessageType.CLIENT_IS_READY)));
    };

    // If readyState is OPEN, start sending. Otherwise wait.
    if (this._socket.readyState === 1) {
      onopen();
    } else {
      this._socket.onopen = onopen;
    }
  }

  // Send an operation to all other sites
  public broadcastOperation(operation: OperationBase.Operation):void {
    let jsonOp = {};
    operation.fillJson(jsonOp);
    this._socket.send(JSON.stringify(new OperationMessage(jsonOp)));
  }
}
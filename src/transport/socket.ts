/// <reference path='../base/logging.ts' />
/// <reference path='../ot/control.ts' />
/// <reference path='../ot/messages.ts' />
/// <reference path='../ot/text.ts' />
/// <reference path='../typings/socket.io/client.d.ts' />

// Used by the client
class Socket implements OTTransport {
  private _socket: SocketIOClient.Socket;
  private _siteId: number = null;

  connect(
    documentId: string,

    // handleSiteId will always be called before the first call to handleConnectedClients
    // which will always be called before the first call to handleRemoteOp
    handleSiteId: (siteId: number) => void,
    handleConnectedClients:(connectedClients: Array<number>) => void,
    handleRemoteOp: (op: Operation) => void
  ): void {
    this._socket = io();

    // First the server will send us our site id
    this._socket.on('site_id', (msg: SiteIdMessage) => {
      this._siteId = msg.siteId;
      handleSiteId(msg.siteId);
      this._socket.emit('document_connect', { documentId: documentId });
    });

    // Then it will tell us who else is connected on this document.
    // This will also be called every time someone new joins.
    this._socket.on('document_connections', (msg: DocumentConnectionsMessage) => {
      if (msg.connectedSites.indexOf(this._siteId) === -1) { fail('Server thinks we\'re not in this document'); }
      handleConnectedClients(msg.connectedSites);
    });

    // We'll get operation notifications whenever someone in this room
    // broadcasts.
    this._socket.on('operation', (msg: OperationMessage) => {
      log('Socket', 'handleRemoteOperation', msg);
      let textOp = new TextOp(null, null, null);
      textOp.initWithJson(msg.operation);
      handleRemoteOp(textOp);
    });
  }

  // Send an operation to all other sites
  public broadcastOperation(operation: Operation):void {
    let jsonOp = {};
    operation.fillJson(jsonOp);

    let msg: OperationMessage = <OperationMessage>{};
    msg.operation = jsonOp;
    this._socket.emit('operation', msg);
  }
}
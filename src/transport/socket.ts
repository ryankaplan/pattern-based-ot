/// <reference path='../base/logging.ts' />
/// <reference path='../ot/control_messages.ts' />
/// <reference path='../typings/socket.io/client.d.ts' />

class Socket implements OTTransport {
  private _socket: SocketIOClient.Socket;
  private _siteId: number = null;

  private _handleConnect: (siteId:number) => void = null;
  private _handleDocumentConnectionsMessage: (documentConnections: Array<number>) => void = null;
  private _handleRemoteOp: (op:any) => void = null;

  public connect(complete: (siteId:number) => void) {
    log('connect called');
    this._handleConnect = complete;

    this._socket = io();

    this._socket.on('site_id', this.handleSiteIdMessage.bind(this));
    this._socket.on('document_connections', this.handleDocumentConnectionsMessage.bind(this));
    this._socket.on('operation', this.handleOperationMessage.bind(this));
  }

  connectToDocument(documentId: string, handleConnectedClients:(connectedClients: Array<number>) => void): void {
    this._handleDocumentConnectionsMessage = handleConnectedClients;
    this._socket.emit('document_connect', {
      documentId: documentId
    });
  }

  listenForOps(handleRemoteOp: (op: Operation) => void): void {
    this._handleRemoteOp = handleRemoteOp;
  }

  // Send an operation to all other sites
  public broadcastOperation(operation: Operation):void {
    let jsonOp = {};
    operation.fillJson(jsonOp);

    let msg: OperationMessage = <OperationMessage>{};
    msg.operation = jsonOp;
    this._socket.emit('operation', msg);
  }

  private handleSiteIdMessage(msg: SiteIdMessage) {
    log('Socket', 'handleSiteId', msg);
    assert(this._handleConnect !== null,
      'We only start listening for siteId in connect which is where we set _handleConnect');
    this._siteId = msg.siteId;
    this._handleConnect(msg.siteId);
  }

  private handleDocumentConnectionsMessage(msg: DocumentConnectionsMessage) {
    if (msg.connectedSites.indexOf(this._siteId) === -1) {
      throw 'TODO(ryan)';
    }

    log('Socket', 'handleClientConnected', msg);
    if (!this._handleDocumentConnectionsMessage) {
      fail("OTClient didn't call listenAsClient in time");
    }

    this._handleDocumentConnectionsMessage(msg.connectedSites);
  }

  private handleOperationMessage(msg: OperationMessage) {
    log('Socket', 'handleRemoteOperation', msg);
    if (!this._handleRemoteOp) {
      fail("OTClient didn't call listenAsClient in time");
    }

    let textOp = new TextOp(null, null, null);
    textOp.initWithJson(msg.operation);
    this._handleRemoteOp(textOp);
  }
}
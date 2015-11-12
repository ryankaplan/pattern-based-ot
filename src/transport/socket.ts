/// <reference path='../typings/socketio/client.d.ts' />

/// <reference path='../base/logging.ts' />

class Socket implements OTTransport {
  private _socket:SocketIOClient.Socket;
  private _siteId:number = null;

  private _handleConnect:(siteId:number) => void = null;
  private _handleOtherClientConnected:(siteId:number) => void = null;
  private _handleRemoteOp:(op:any) => void = null;

  public connect(complete:(siteId:number) => void) {
    log('connect called');
    this._handleConnect = complete;

    this._socket = io();

    // There are currently three messages sent in our protocol.
    //
    // site_id => you just connected, here's your site id
    // client_conected => another client just connected, here's its site id
    // operation => an operation was broadcast by some client
    //
    this._socket.on('site_id', this.handleSiteId.bind(this));
    this._socket.on('client_connected', this.handleClientConnected.bind(this));
    this._socket.on('operation', this.handleRemoteOperation.bind(this));
  }

  public listenAsClient(handleConnect:(siteId:number) => void,
                        handleRemoteOp:(op:Operation) => void):void {
    this._handleOtherClientConnected = handleConnect;
    this._handleRemoteOp = handleRemoteOp;
  }

  // Send an operation to all other sites
  public broadcast(operation:Operation):void {
    let jsonOp = {};
    operation.fillJson(jsonOp);
    this._socket.emit('operation', jsonOp);
  }

  private handleSiteId(msg:any) {
    log('Socket', 'handleSiteId', msg);
    assert(this._handleConnect !== null,
      'We only start listening for siteId in connect which is where we set _handleConnect');
    this._siteId = msg.siteId;
    this._handleConnect(msg.siteId);
  }

  private handleClientConnected(msg:any) {
    if (msg.siteId == this._siteId) {
      return;
    }

    log('Socket', 'handleClientConnected', msg);
    if (!this._handleOtherClientConnected) {
      fail("OTClient didn't call listenAsClient in time");
    }

    this._handleOtherClientConnected(msg.siteId);
  }

  private handleRemoteOperation(msg:any) {
    log('Socket', 'handleRemoteOperation', msg);
    if (!this._handleRemoteOp) {
      fail("OTClient didn't call listenAsClient in time");
    }

    let textOp = new TextOp(null, null, null);
    textOp.initWithJson(msg.operation);
    this._handleRemoteOp(textOp);
  }
}
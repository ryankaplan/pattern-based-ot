/// <reference path='../ot/ot_server.ts' />
/// <reference path='../typings/socket.io/socket.io.d.ts' />

// Used by the server
class SocketServer implements OTSocketServer {
  constructor(private _server: SocketIO.Server) {}

  send(channel: string, type: string, msg: any) {
    this._server.to(channel).emit(type, msg);
  }
}
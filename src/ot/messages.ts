
// Here's the client/server protocol for the pattern based OT server:
//
// - Client connects to server
// - Server sends a SiteIdMessage to just that client with its site id
// - Client sends a DocumentConnectMessage which adds it to a particular document
// - Server broadcasts a DocumentConnectionsMessage to everyone which is
//   an array of siteIds connected to that document
//
// Then clients often send OperationMessages to each other via the server.

class MessageType {
  constructor(public value: string){ }
  toString(){ return this.value; }

  static CLIENT_IS_READY = new MessageType('ready');
  static SITE_ID = new MessageType('site_id');
  static DOCUMENT_CONNECT = new MessageType('document_connect');

  static INITIAL_LOAD_BEGIN = new MessageType('initial_load_begin');
  static INITIAL_LOAD_END = new MessageType('initial_load_end');

  static DOCUMENT_CONNECTIONS = new MessageType('document_connections');
  static OPERATION = new MessageType('operation');
}

class OTMessage {
  constructor(public type: MessageType) { }
}

class SiteIdMessage extends OTMessage {
  constructor(public siteId: number) {
    super(MessageType.SITE_ID);
  }
}

class DocumentConnectMessage extends OTMessage {
  constructor(public documentId: string) {
    super(MessageType.DOCUMENT_CONNECT);
  }
}

class DocumentConnectionsMessage extends OTMessage {
  constructor(public connectedSites: Array<number>) {
    super(MessageType.DOCUMENT_CONNECTIONS);
  }
}

class OperationMessage extends OTMessage {
  constructor(public jsonOp: any) {
    super(MessageType.OPERATION);
  }
}

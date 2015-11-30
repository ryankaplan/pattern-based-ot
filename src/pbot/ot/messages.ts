
// TODO(ryan): Document the client/server protocol in full
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
  constructor(public siteId: string) {
    super(MessageType.SITE_ID);
  }
}

class DocumentConnectMessage extends OTMessage {
  constructor(public documentId: string) {
    super(MessageType.DOCUMENT_CONNECT);
  }
}

class DocumentConnectionsMessage extends OTMessage {
  constructor(public connectedSites: Array<string>) {
    super(MessageType.DOCUMENT_CONNECTIONS);
  }
}

class OperationMessage extends OTMessage {
  constructor(public jsonOp: any) {
    super(MessageType.OPERATION);
  }
}

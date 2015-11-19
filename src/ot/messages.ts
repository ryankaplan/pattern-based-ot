
// Here's the client/server protocol for the pattern based OT server:
//
// - Client connects to server
// - Server sends a SiteIdMessage to just that client with its site id
// - Client sends a DocumentConnectMessage which adds it to a particular document
// - Server broadcasts a DocumentConnectionsMessage to everyone which is
//   an array of siteIds connected to that document
//
// Then clients often send OperationMessages to each other via the server.

enum MessageType {
  SITE_ID,
  DOCUMENT_CONNECT,
  DOCUMENT_CONNECTIONS,
  OPERATION
}

interface IMessage {
  type: MessageType;
}

class SiteIdMessage implements IMessage {
  type: MessageType = MessageType.SITE_ID;

  constructor(
    public siteId: number
  ) {}
}

class DocumentConnectMessage implements IMessage {
  type: MessageType = MessageType.DOCUMENT_CONNECT;

  constructor(
    public documentId: string
  ) {}
}

class DocumentConnectionsMessage implements IMessage {
  type: MessageType = MessageType.DOCUMENT_CONNECT;

  constructor(
    public connectedSites: Array<number>
  ) {}
}

class OperationMessage implements IMessage {
  type: MessageType = MessageType.OPERATION;

  constructor(
    public jsonOp: any
  ) {}
}


// Here's the client/server protocol for the pattern based OT server:
//
// - Client connects to server
// - Server sends a SiteIdMessage to just that client with its site id
// - Client sends a DocumentConnectMessage which adds it to a particular document
// - Server broadcasts a DocumentConnectionsMessage to everyone which is
//   an array of siteIds connected to that document
//
// Then clients often send OperationMessages to each other via the server.

interface SiteIdMessage {
  siteId: number;
}

interface DocumentConnectMessage {
  documentId: string;
}

interface DocumentConnectionsMessage {
  connectedSites: Array<number>;
}

interface OperationMessage {
  operation: any;
}

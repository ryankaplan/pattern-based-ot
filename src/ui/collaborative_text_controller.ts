/// <reference path='../typings/diff_match_patch/diff_match_patch.d.ts' />
/// <reference path='../typings/jquery/jquery.d.ts' />
/// <reference path='../typings/socketio/client.d.ts' />

/// <reference path='../ot/control.ts' />
/// <reference path='../ot/text.ts' />

// Messages that are send through our sockets:
//
// site_id
// client_connected
// operation
//

import Socket = SocketIOClient.Socket;
class SocketTransport implements OTTransport {
    private _socket: SocketIOClient.Socket;
    private _siteId: number = null;

    private _handleConnect: (siteId: number) => void = null;
    private _handleOtherClientConnected: (siteId: number) => void = null;
    private _handleRemoteOp: (op: any) => void = null;

    public connect(complete: (siteId: number) => void) {
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

    public listenAsClient(
        handleConnect: (siteId: number) => void,
        handleRemoteOp: (op: Operation) => void
    ): void {
        this._handleOtherClientConnected = handleConnect;
        this._handleRemoteOp = handleRemoteOp;
    }

    // Send an operation to all other sites
    public broadcast(operation: Operation): void {
        let jsonOp = {};
        operation.fillJson(jsonOp);
        this._socket.emit('operation', jsonOp);
    }

    private handleSiteId(msg: any) {
        log('SocketTransport', 'handleSiteId', msg);
        assert(this._handleConnect !== null,
            'We only start listening for siteId in connect which is where we set _handleConnect');
        this._siteId = msg.siteId;
        this._handleConnect(msg.siteId);
    }

    private handleClientConnected(msg: any) {
        if (msg.siteId == this._siteId) {
            return;
        }

        log('SocketTransport', 'handleClientConnected', msg);
        if (!this._handleOtherClientConnected) {
            fail("OTClient didn't call listenAsClient in time");
        }

        this._handleOtherClientConnected(msg.siteId);
    }

    private handleRemoteOperation(msg: any) {
        log('SocketTransport', 'handleRemoteOperation', msg);
        if (!this._handleRemoteOp) {
            fail("OTClient didn't call listenAsClient in time");
        }

        let textOp = new TextOp(null, null, null);
        textOp.initWithJson(msg.operation);
        this._handleRemoteOp(textOp);
    }
}


/**
 * A Controller instance is tied to a textarea on the page. To make your
 * <textarea id="collab-doc" /> collaborative, just instantiate a controller
 * for it, like so:
 *
 * var controller = new Controller("#collab-doc");
 */
class CollaborativeTextController implements OTClientListener {
    private _socket = new SocketTransport();
    private _client: OTClient = null;

    // jQuery wrapped div of the textarea that we're watching
    private _textArea: any;
    private _lastKnownDocumentContent: string;

    constructor(elementSelector: string) {
        log("DocumentController created");
        this._textArea = $(elementSelector);
        this._lastKnownDocumentContent = "";

        // Re-shown when we're connected
        this._textArea.hide();

        this._socket.connect((function (siteId: number) {
            let model = new TextOperationModel('');
            this._client = new OTClient(this._socket, siteId, model);
            this._client.addListener(this);

            this._textArea.show();
            this._textArea.attr("contentEditable", "true");
            this._textArea.val("");
            this._lastKnownDocumentContent = this._textArea.val();
            this._textArea.bind('input propertychange', this.handleTextAreaChangeEvent.bind(this));
        }).bind(this));
    }

    private handleTextAreaChangeEvent() {
        var newText = this._textArea.val();
        if (newText == this._lastKnownDocumentContent) {
            log("Returning early; nothing to sync!");
            return;
        }
        this.processLocalTextDiff(this._lastKnownDocumentContent, newText);
        this._lastKnownDocumentContent = newText;
    }

    private processLocalTextDiff(oldText: string, newText: string) {
        log("Processing text diff of length", Math.abs(oldText.length - newText.length));
        var differ = new diff_match_patch();

        // Each `any` is a two-element list of text-operation-type and the text that
        // it applies to, like ["DIFF_DELETE", "monkey"] or ["DIFF_EQUAL", "ajsk"] or
        // ["DIFF_INSERT", "rabbit"]
        var results: Array<Array<any>> = differ.diff_main(oldText, newText);

        var cursorLocation = 0;
        var operationBuffer: Array<TextOp> = [];
        for (var i = 0; i < results.length; i++) {
            var op = results[i][0];
            var text = results[i][1];

            if (op == DIFF_DELETE) {
                for (var j = 0; j < text.length; j++) {
                    log("Delete char " + text[j] + " at index " + cursorLocation);
                    operationBuffer.push(TextOp.Delete(cursorLocation));

                    // cursorLocation doesn't change. We moved forward one character in the string
                    // but deleted that character, so our 'index' into the string hasn't changed.
                }
            }

            else if (op == DIFF_INSERT) {
                for (var j = 0; j < text.length; j++) {
                    log("Insert char " + text[j] + " after char at index " + cursorLocation);
                    operationBuffer.push(TextOp.Insert(text[j], cursorLocation));
                    cursorLocation += 1;
                }
            }

            else if (op == DIFF_EQUAL) {
                cursorLocation += text.length;
            }
        }

        for (var textOp of operationBuffer) {
            this._client.handleLocalOp(textOp);
        }
    }

    clientWillHandleRemoteOps(model: OperationModel) {
        // TODO(ryan): This will be useful when we want to batch updates and send
        // them after a delay. We want to be sure that whenever we're about to handle
        // remote ops that we've accounted for all recent changes in the document.
    }

    clientDidHandleRemoteOps(model: OperationModel) {
        let textModel: TextOperationModel = <TextOperationModel>model;
        this._lastKnownDocumentContent = textModel.render();
        this._textArea.val(this._lastKnownDocumentContent);
    }
}

var pageController: CollaborativeTextController = null;
$(document).ready(function () {
    pageController = new CollaborativeTextController("#ot-document");
});

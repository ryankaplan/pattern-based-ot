/// <reference path='../../base/logging.ts' />
/// <reference path='../../base/url.ts' />
/// <reference path='../../pbot/control.ts' />
/// <reference path='../../pbot/operation.ts' />
/// <reference path='../../pbot/char/text_op.ts' />
/// <reference path='../../pbot/socket_client_transport.ts' />
/// <reference path='typings/diff_match_patch/diff_match_patch.d.ts' />
/// <reference path='typings/jquery/jquery.d.ts' />

// Messages that are send through our sockets:
//
// site_id
// client_connected
// operation
//

/**
 * A Controller instance is tied to a textarea on the page. To make your
 * <textarea id="collab-doc" /> collaborative, just instantiate a controller
 * for it, like so:
 *
 * var controller = new Controller("#collab-doc");
 */
class CollaborativeTextController implements OTClientListener {
  private _socket = new SocketClientTransport(new WebSocket('ws://localhost:3000/', ['pbotProtocol']));
  private _client:OTClient = null;
  private _model: Char.Model = null;

  // jQuery wrapped div of the textarea that we're watching
  private _textArea: any;
  private _loadingMessage: any;
  private _lastKnownDocumentContent: string;

  constructor(textAreaSelector: string, loadingElementSelector: string) {
    this._textArea = $(textAreaSelector);
    this._loadingMessage = $(loadingElementSelector);
    this._lastKnownDocumentContent = "";

    // Re-shown when we're connected
    this._loadingMessage.show();
    this._textArea.hide();

    this._model = new Char.Model('');

    let documentId = getDocumentQueryArg('documentId');
    this._client = new OTClient(this._socket, documentId, this._model);
    this._client.addListener(this);
    this._client.connect();
  }

  // OTClientDelegate implementation

  clientDidConnectToDocument() {
    this._loadingMessage.hide();
    this._textArea.show();

    this._textArea.attr("contentEditable", "true");
    let documentContent = this._model.render();
    this._textArea.val(documentContent);
    this._lastKnownDocumentContent = this._textArea.val();
    this._textArea.bind('input propertychange', this.handleTextAreaChangeEvent.bind(this));
  }

  clientDidHandleRemoteOps(model: OperationBase.Model) {
    let textModel: Char.Model = <Char.Model>model;
    this._lastKnownDocumentContent = textModel.render();
    this._textArea.val(this._lastKnownDocumentContent);
  }

  // UI helpers

  private handleTextAreaChangeEvent() {
    var newText = this._textArea.val();
    if (newText == this._lastKnownDocumentContent) {
      debugLog("Returning early; nothing to sync!");
      return;
    }
    this.processLocalTextDiff(this._lastKnownDocumentContent, newText);
    this._lastKnownDocumentContent = newText;
  }

  private processLocalTextDiff(oldText:string, newText:string) {
    debugLog("Processing text diff of length", Math.abs(oldText.length - newText.length));
    var differ = new diff_match_patch();

    // Each `any` is a two-element list of text-operation-type and the text that
    // it applies to, like ["DIFF_DELETE", "monkey"] or ["DIFF_EQUAL", "ajsk"] or
    // ["DIFF_INSERT", "rabbit"]
    var results:Array<Array<any>> = differ.diff_main(oldText, newText);

    var cursorLocation = 0;
    var operationBuffer:Array<Char.Operation> = [];
    for (var i = 0; i < results.length; i++) {
      var op = results[i][0];
      var text = results[i][1];

      if (op == DIFF_DELETE) {
        for (var j = 0; j < text.length; j++) {
          debugLog("Delete char " + text[j] + " at index " + cursorLocation);
          operationBuffer.push(Char.Operation.Delete(cursorLocation));

          // cursorLocation doesn't change. We moved forward one character in the string
          // but deleted that character, so our 'index' into the string hasn't changed.
        }
      }

      else if (op == DIFF_INSERT) {
        for (var j = 0; j < text.length; j++) {
          debugLog("Insert char " + text[j] + " after char at index " + cursorLocation);
          operationBuffer.push(Char.Operation.Insert(text[j], cursorLocation));
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
}

var pageController:CollaborativeTextController = null;
$(document).ready(function () {
  pageController = new CollaborativeTextController("#ot-document", "#loading-message");
});

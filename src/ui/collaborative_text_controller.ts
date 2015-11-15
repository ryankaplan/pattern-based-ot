/// <reference path='../base/logging.ts' />
/// <reference path='../browser/url.ts' />
/// <reference path='../ot/control.ts' />
/// <reference path='../ot/operation.ts' />
/// <reference path='../ot/text.ts' />
/// <reference path='../transport/socket_client_transport.ts' />
/// <reference path='../typings/diff_match_patch/diff_match_patch.d.ts' />
/// <reference path='../typings/jquery/jquery.d.ts' />
/// <reference path='../typings/socket.io/client.d.ts' />

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
  private _socket = new SocketClientTransport(io());
  private _client:OTClient = null;

  // jQuery wrapped div of the textarea that we're watching
  private _textArea:any;
  private _lastKnownDocumentContent:string;

  constructor(elementSelector:string) {
    this._textArea = $(elementSelector);
    this._lastKnownDocumentContent = "";

    // Re-shown when we're connected
    this._textArea.hide();

    let model = new TextOperationModel('');

    let documentId = getDocumentQueryArg('documentId');
    this._client = new OTClient(this._socket, documentId, model);
    this._client.addListener(this);
    this._client.connect();
  }

  // OTClientDelegate implementation

  clientDidConnectToDocument() {
    this._textArea.show();
    this._textArea.attr("contentEditable", "true");
    this._textArea.val("");
    this._lastKnownDocumentContent = this._textArea.val();
    this._textArea.bind('input propertychange', this.handleTextAreaChangeEvent.bind(this));
  }

  clientWillHandleRemoteOps(model:OperationModel) {
    // TODO(ryan): This will be useful when we want to batch updates and send
    // them after a delay. We want to be sure that whenever we're about to handle
    // remote ops that we've accounted for all recent changes in the document.
  }

  clientDidHandleRemoteOps(model:OperationModel) {
    let textModel:TextOperationModel = <TextOperationModel>model;
    this._lastKnownDocumentContent = textModel.render();
    this._textArea.val(this._lastKnownDocumentContent);
  }

  // UI helpers

  private handleTextAreaChangeEvent() {
    var newText = this._textArea.val();
    if (newText == this._lastKnownDocumentContent) {
      log("Returning early; nothing to sync!");
      return;
    }
    this.processLocalTextDiff(this._lastKnownDocumentContent, newText);
    this._lastKnownDocumentContent = newText;
  }

  private processLocalTextDiff(oldText:string, newText:string) {
    log("Processing text diff of length", Math.abs(oldText.length - newText.length));
    var differ = new diff_match_patch();

    // Each `any` is a two-element list of text-operation-type and the text that
    // it applies to, like ["DIFF_DELETE", "monkey"] or ["DIFF_EQUAL", "ajsk"] or
    // ["DIFF_INSERT", "rabbit"]
    var results:Array<Array<any>> = differ.diff_main(oldText, newText);

    var cursorLocation = 0;
    var operationBuffer:Array<TextOp> = [];
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
}

var pageController:CollaborativeTextController = null;
$(document).ready(function () {
  pageController = new CollaborativeTextController("#ot-document");
});

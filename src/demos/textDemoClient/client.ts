/// <reference path='../../base/logging.ts' />
/// <reference path='../../base/url.ts' />
/// <reference path='../../pbot/ui bindings/collaborative_text_area_binding.ts' />

/// <reference path='../typings/jquery/jquery.d.ts' />

/**
 * This is an example UI controller for a collaborative text editor.
 * Instantiate it with a documentId (the text document on the server
 * to bind to the <textarea />), the id of the textarea DOM element
 * that you want to bind to, and the id of a loading indicator. The
 * indicator will be shown when the controller is constructed and
 * be hidden when it is loaded and ready to be used.
 */
class CollaborativeTextController implements OTClientListener {
  private _binding: CollaborativeTextAreaBinding = null;

  private _textArea: HTMLElement; // <textarea />
  private _loadingLabel: HTMLElement;

  constructor(documentId: string, textAreaId: string, loadingElementId: string) {
    this._textArea = document.getElementById(textAreaId);
    this._loadingLabel = document.getElementById(loadingElementId);

    // Re-shown when we're connected
    this._textArea.style.display = 'none';

    this._binding = new CollaborativeTextAreaBinding(documentId, this._textArea);
    this._binding.client().addListener(this);
  }

  // OTClientListener implementation

  clientDidConnectToDocument() {
    this._loadingLabel.style.display = 'none';
    this._textArea.style.display = null;
  }

  // intentionally empty
  clientDidHandleRemoteOps(model: OperationBase.Model) { }
}

var pageController: CollaborativeTextController = null;
$(document).ready(function () {
  let documentId = getDocumentQueryArg('documentId');
  pageController = new CollaborativeTextController(documentId, "ot-document", "loading-message");
});

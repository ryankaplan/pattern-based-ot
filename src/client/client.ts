/// <reference path='../typings/diff_match_patch/diff_match_patch.d.ts' />
/// <reference path='../typings/jquery/jquery.d.ts' />
/// <reference path='../typings/socketio/client.d.ts' />
/// <reference path='../ot-control/test.ts' />
/// <reference path='../ot-operations/text.ts' />

module OTDemoPage {
    var loggingEnabled = false;
    var log = function (...things: Array<any>) {
        if (this.console && loggingEnabled) {
            console.log.apply(console, arguments);
        }
    };

    /**
     * A Controller instance is tied to a textarea on the page. To make your
     * <textarea id="collab-doc" /> collaborative, just instantiate a controller
     * for it, like so:
     *
     * var controller = new Controller("#collab-doc");
     *
     * This is how it works:
     *
     * 1. First it tries to get a siteId from the server. Once it gets one, it
     *    shows the textarea and starts polling it for changes.
     * 2. When a change is detected, diff the textarea content against the last
     *    known content. With the help of WootTypes.WString, turn that diff into
     *    WStringOperations and broadcast those operations to the server.
     * 3. When we receive operations from the server, apply those operations to
     *    our WString instance and apply them to the text in #collab-doc.
     */
    export class DocumentController {
        _socket: SocketIOClient.Socket;
        // _siteId is -1 before we hear back from the server
        _siteId: number;

        // jQuery wrapped div of the textarea that we're watching
        _textArea: any;
        _lastKnownDocumentContent: string;

        _lastSyncTimeoutId: number;

        constructor(elementSelector: string) {
            log("DocumentController created");
            this._socket = io();
            this._siteId = -1;
            this._textArea = $(elementSelector);
            this._lastKnownDocumentContent = "";

            this._textArea.hide(); // Re-shown in handleReceiveSiteId
            this._socket.on('site_id', this.handleReceiveSiteId.bind(this));
            this._socket.on('operations', this.handleRemoteOperations.bind(this));
        }

        handleReceiveSiteId(siteId: number) {
            log("DocumentController received siteId: ", siteId);
            this._siteId = siteId;
            this._textArea.show();
            this._textArea.attr("contentEditable", "true");

            // TODO(ryan): This is a hack. Sometimes a textarea's val starts out as a newline. Fix this.
            this._textArea.val("");
            this._lastKnownDocumentContent = this._textArea.val();
            this._textArea.bind('input propertychange', this.handleTextAreaChangeEvent.bind(this));
        }

        /**
         * The logic for syncing changes is to wait 500ms from the last change and then
         * to sync. This is weird in the case that someone is typing out a whole paragraph
         * and it seems like it's not syncing at all.
         *
         * On the other hand, syncing on every text event can feel pretty laggy. I bet the
         * right thing to do is a middle ground where we do what we're doing now, but we
         * flush when we see the text diff get big enough...
         */
        handleTextAreaChangeEvent() {
            // Clear the last handler for a text change event in case it hasn't happened
            window.clearTimeout(this._lastSyncTimeoutId);

            this._lastSyncTimeoutId = setTimeout(function () {
                log("Passed inactivity threshold. Syncing document.");
                var newText = this._textArea.val();
                if (newText == this._lastKnownDocumentContent) {
                    log("Returning early; nothing to sync!");
                    return;
                }
                this.processLocalTextDiff(this._lastKnownDocumentContent, newText);
                this._lastKnownDocumentContent = newText;
            }.bind(this), 250);
        }

        /**
         * This should be called when we notice a change in our text view. It compares the old text
         * against the new, generates the appropriate WStringOperations, and sends them to the server
         * for broadcasting.
         */
        processLocalTextDiff(oldText: string, newText: string) {
            var startTimeMs = performance.now();
            log("Processing text diff of length", Math.abs(oldText.length - newText.length));
            var differ = new diff_match_patch();

            // Each `any` is a two-element list of text-operation-type and the text that
            // it applies to, like ["DIFF_DELETE", "monkey"] or ["DIFF_EQUAL", "ajsk"] or
            // ["DIFF_INSERT", "rabbit"]
            var results: Array<Array<any>> = differ.diff_main(oldText, newText);

            // Turn the results into a set of operations that our woot algorithm understands
            var cursorLocation = 0;
            var operationBuffer: Array<any> = [];
            for (var i = 0; i < results.length; i++) {
                var op = results[i][0];
                var text = results[i][1];

                if (op == DIFF_DELETE) {
                    for (var j = 0; j < text.length; j++) {
                        log("Delete char " + text[j] + " at index " + cursorLocation);
                        // TODO(ryan): push onto operationBuffer


                        // cursorLocation doesn't change. We moved forward one character in the string
                        // but deleted that character, so our 'index' into the string hasn't changed.
                    }
                }

                else if (op == DIFF_INSERT) {
                    for (var j = 0; j < text.length; j++) {
                        log("Insert char " + text[j] + " after char at index " + cursorLocation);
                        // TODO(ryan): push onto operationBuffer

                        cursorLocation += 1;
                    }
                }

                else if (op == DIFF_EQUAL) {
                    cursorLocation += text.length;
                }
            }

            this.sendMessage("operations", operationBuffer);
        }

        handleRemoteOperations(jsonOperations: Array<any>) {
            // TODO(ryan)
            let newString = "blah blah blah";

            // Set this so that we don't think the user made this change and enter
            // a feedback loop
            this._lastKnownDocumentContent = newString;
            this._textArea.val(newString);
        }

        // Sends a message to the server. Returns false if sending failed
        // e.g. if we haven't received our siteId yet.
        sendMessage(message: string, data: any): boolean {
            if (this._siteId !== -1) {
                this._socket.emit(message, data);
                return true;
            }
            throw "NOOO";
            return false;
        }

    }
}

var pageController: OTDemoPage.DocumentController = null;
$(document).ready(function () {
    pageController = new OTDemoPage.DocumentController("#ot-document");
});

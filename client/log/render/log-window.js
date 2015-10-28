/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object')
(function() {

    // Events

    //self.addEventListener('submit', onFormEvent);
    //self.addEventListener('input', onFormEvent);
    //self.addEventListener('change', onFormEvent);

})();


// Worker Scripts
if(typeof module === 'object') {
    var TEMPLATE_URL = 'client/log/render/log-window.html';
    var CONTAINER_ID = 'log-window';

    module.exports.renderLogWindow = renderLogWindow;
    module.exports.renderLogEntry = renderLogEntry;
    module.exports.renderLogActionEntry = renderLogActionEntry;

    if(typeof self.activeContainers == 'undefined')
        self.activeContainers = [];
    module.exports.activeContainers = self.activeContainers;

    function renderLogWindow(callback) {

        if(self.activeContainers.indexOf(CONTAINER_ID) >= 0)
            return false;
        self.activeContainers.push(CONTAINER_ID);

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText
                //.replace(/{\$url}/gi, url)
        );
    }

    function renderLogEntry(logContent, direction, callback) {
        // Template
        var SOCKET_TEMPLATE_LOG_ENTRY =
            "\n<div class='log-entry'>" +
            "\n\t<span class='direction'>{$DIR}:</span>" +
            "\n\t<span class='message'>{$content}</span>" +
            "\n</div>";

        var logContentEscaped = logContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        var logEntryHTML = SOCKET_TEMPLATE_LOG_ENTRY
            .replace(/{\$DIR}/g, direction)
            .replace(/{\$content}/gi, logContentEscaped);

        // Callback
        return callback(logEntryHTML, callback)
    }


    function renderLogActionEntry(action, callback) {
        // Template
        var SOCKET_TEMPLATE_ACTION_ENTRY =
            "\n<div class='log-entry'>" +
            "\n\t<span class='action'>{$action}</span>" +
            "\n</div>";

        var logEntryHTML = SOCKET_TEMPLATE_ACTION_ENTRY
            .replace(/{\$action}/g, action);

        // Callback
        return callback(logEntryHTML, callback)
    }
}

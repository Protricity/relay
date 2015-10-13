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


// Worker Script
else
(function() {
    var TEMPLATE_URL = 'ks/render/log/ks-log-window.html';

    exports.renderLogWindow = function(commandString, callback) {
        var match = url.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var host = match[4];
        if(!host)
            throw new Error("Invalid Host: " + url);

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL);
        xhr.onload = function () {
            callback(xhr.responseText
                    .replace(/{\$host}/gi, host)
                    .replace(/{\$url}/gi, url)
            );
        };
        xhr.send();
    };

    exports.renderLogWindowEntry = function(logContent, direction, callback) {
        // Template
        var SOCKET_TEMPLATE_LOG_ENTRY =
            "\n<div class='log-entry'>" +
            "\n\t<span class='direction'>{$DIR}</span>:" +
            "\n\t<span class='message'>{$content}</span>" +
            "\n</div>";

        // Callback
        return callback(SOCKET_TEMPLATE_LOG_ENTRY
                .replace(/{\$DIR}/g, direction)
                .replace(/{\$content}/gi, logContent
            )
        );
    };


    exports.renderLogWindowActionEntry = function(action, callback) {
        // Template
        var SOCKET_TEMPLATE_ACTION_ENTRY =
            "\n<div class='log-entry'>" +
            "\n\t<span class='action'>{$action}</span>" +
            "\n</div>";

        // Callback
        callback(SOCKET_TEMPLATE_ACTION_ENTRY
                .replace(/{\$action}/gi, action)
        );
    };
})();
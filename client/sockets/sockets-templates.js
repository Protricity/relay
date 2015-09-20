/**
 * Created by ari on 6/19/2015.
 */

var templateSocketLog = function(url, callback) {

    // Template
    var SOCKET_TEMPLATE = "\
        <article class='channel socket:{$socket_url} minimized' data-sort='z'>\n\
            <link rel='stylesheet' href='socket/socket.css' type='text/css'>\n\
            <legend class='title'>\
                <a href='#MINIMIZE socket:{$socket_url}'>\
                    <span class='command'>Socket</span> {$socket_host}\
                </a>\
            </legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE socket:{$socket_url}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE socket:{$socket_url}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE socket:{$socket_url}'>[x]</a>\n\
            </div>\n\
            <fieldset class='socket-log:{$socket_url}'></fieldset>\n\
            </form>\n\
        </article>";

    var match = url.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
    var host = match[4];
    if(!host)
        throw new Error("Invalid Host: " + url);

    // Callback
    return callback(SOCKET_TEMPLATE
            .replace(/{\$socket_host}/gi, host)
            .replace(/{\$socket_url}/gi, url)
    );
};


var templateSocketLogEntry = function(socketMessageContent, direction, callback) {
    // Template
    var SOCKET_TEMPLATE_LOG_ENTRY = "\
        <div class='websocket-log'>\n\
            <span class='direction'>{$DIR}</span>:\n\
            <span class='message'>{$content}</span>\n\
        </div>\
    ";

    // Callback
    return callback(SOCKET_TEMPLATE_LOG_ENTRY
        .replace(/{\$DIR}/g, direction)
        .replace(/{\$content}/gi, socketMessageContent
            .replace(/&/g, '&amp;')
            .replace(/&amp;amp;/, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
        )
    );
};


var templateSocketActionEntry = function(action, callback) {
    // Template
    var SOCKET_TEMPLATE_ACTION_ENTRY = "\
        <div class='websocket-log'>\n\
            <span class='action'>{$action}</span>\n\
        </div>\n\
        ";

    // Callback
    callback(SOCKET_TEMPLATE_ACTION_ENTRY
        .replace(/{\$action}/gi, action)
    );
};
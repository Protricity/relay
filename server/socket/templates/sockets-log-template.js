/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.socket = Templates.socket || {};
Templates.socket.log = Templates.socket.log || {};
Templates.socket.log.container = function(url, callback) {

    // Template
    var SOCKET_TEMPLATE = "\
        <article class='socket:{$url} minimized' data-sort='z'>\n\
            <link rel='stylesheet' href='server/socket/sockets.css' type='text/css'>\n\
            <header class='header-bar show-on-minimized'>\n\
                <a href='#MAXIMIZE socket:{$url}'>ws://{$host}</a>\n\
            </header>\
            <div class='header-bar-buttons show-on-minimized'>\n\
                <a href='#MINIMIZE socket:{$url}'>[-]</a><!--\n\
             --><a href='#MAXIMIZE socket:{$url}'>[+]</a><!--\n\
             --><a href='#CLOSE socket:{$url}'>[x]</a>\n\
            </div>\n\
            <div class='socket-log socket-log:{$url} hide-on-minimized'></div>\n\
            <footer class='footer-bar'>&nbsp;</footer>\n\
        </article>";

    var match = url.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
    var host = match[4];
    if(!host)
        throw new Error("Invalid Host: " + url);

    // Callback
    return callback(SOCKET_TEMPLATE
        .replace(/{\$host}/gi, host)
        .replace(/{\$url}/gi, url)
    );
};


Templates.socket.log.entry = function(socketMessageContent, direction, callback) {
    // Template
    var SOCKET_TEMPLATE_LOG_ENTRY =
        "\n<div class='log-entry'>" +
        "\n\t<span class='direction'>{$DIR}</span>:" +
        "\n\t<span class='message'>{$content}</span>" +
        "\n</div>";

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


Templates.socket.log.action = function(action, callback) {
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
/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.ks = Templates.ks || {};
Templates.ks.log = Templates.ks.log || {};
Templates.ks.log.container = function(url, callback) {
    // Template
    var LOG_TEMPLATE = "\
        <article class='channel {$class}' data-sort='z'>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <legend class='title'>\n\
                <a href='#MINIMIZE {$class}'>\n\
                    <span class='command'>KeySpace</span> {$ks_host}\n\
                </a>\n\
            </legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE {$class}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE {$class}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE {$class}'>[x]</a>\n\
            </div>\n\
            <fieldset class='ks-log-content:{$ks_host}'></fieldset>\n\
            </form>\n\
        </article>";

    var match = url.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
    var host = match[4];
    if(!host)
        throw new Error("Invalid Host: " + url);

    var channelClass = "ks-log:" + host;
    // Callback
    return callback(LOG_TEMPLATE
        .replace(/{\$class}/gi, channelClass)
        .replace(/{\$ks_host}/gi, host)
        .replace(/{\$ks_url}/gi, url),
        channelClass
    );
};


Templates.ks.log.entry = function(logContent, direction, callback) {
    // Template
    var SOCKET_TEMPLATE_LOG_ENTRY = "\
        <div class='log-entry'>\n\
            <span class='direction'>{$DIR}</span>:\n\
            <span class='message'>{$content}</span>\n\
        </div>\
    ";

    // Callback
    return callback(SOCKET_TEMPLATE_LOG_ENTRY
        .replace(/{\$DIR}/g, direction)
        .replace(/{\$content}/gi, logContent
            //.replace(/&/g, '&amp;')
            //.replace(/&amp;amp;/, '&amp;')
            //.replace(/</g, '&lt;')
            //.replace(/>/g, '&gt;')
        )
    );
};


Templates.ks.log.action = function(action, callback) {
    // Template
    var SOCKET_TEMPLATE_ACTION_ENTRY = "\
        <div class='log-entry'>\n\
            <span class='action'>{$action}</span>\n\
        </div>\n\
        ";

    // Callback
    callback(SOCKET_TEMPLATE_ACTION_ENTRY
        .replace(/{\$action}/gi, action)
    );
};
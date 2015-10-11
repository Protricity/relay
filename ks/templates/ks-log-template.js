/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.ks = Templates.ks || {};
Templates.ks.log = Templates.ks.log || {};
Templates.ks.log.container = function(url, callback) {
    // Template
    var LOG_TEMPLATE = "\
        <article class='channel ks-log:{$host}' data-sort='z'>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <header class='header-bar'>\n\
                <a href='#MAXIMIZE ks-log:{$host}'>\n\
                    <span class='command'>KeySpace</span> {$host}\n\
                </a>\n\
            </header>\n\
            <div class='header-bar-buttons'>\n\
                <a href='#MINIMIZE put-preview:'>[-]</a><!--\n\
             --><a href='#MAXIMIZE put-preview:'>[+]</a><!--\n\
             --><a href='#CLOSE put-preview:'>[x]</a>\n\
            </div>\n\
            <legend class='title'>\n\
                <a href='#MAXIMIZE ks-log:{$host}'>\n\
                    <span class='command'>KeySpace</span> {$host}\n\
                </a>\n\
            </legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE ks-log:{$host}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE ks-log:{$host}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE ks-log:{$host}'>[x]</a>\n\
            </div>\n\
            <fieldset class='ks-log-content:{$host}'></fieldset>\n\
            </form>\n\
        </article>";

    var match = url.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
    var host = match[4];
    if(!host)
        throw new Error("Invalid Host: " + url);

    // Callback
    return callback(LOG_TEMPLATE
        .replace(/{\$host}/gi, host)
        .replace(/{\$url}/gi, url)
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
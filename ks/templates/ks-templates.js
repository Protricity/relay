/**
 * Created by ari on 6/19/2015.
 */


var KSTemplates = {};
KSTemplates.put = {};
KSTemplates.put.form = function(content, callback) {
    var TEMPLATE_URL = 'ks/templates/ks-put-template.html';

    var xhr = new XMLHttpRequest();
    xhr.open("GET", TEMPLATE_URL);
    xhr.onload = function () {
        callback(xhr.responseText
            .replace(/{\$content}/gi, content || '')
        );
    };
    xhr.send();
    return true;
};

KSTemplates.put.preview = function(commandString, callback) {
    var match = /^put\.preview\s*([\s\S]*)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Preview Command: " + commandString);

    var content = match[1];

    var TEMPLATE_URL = 'ks/templates/ks-put-preview-template.html';

    var xhr = new XMLHttpRequest();
    xhr.open("GET", TEMPLATE_URL);
    xhr.onload = function () {
        callback(xhr.responseText
            .replace(/{\$content}/gi, content || '')
        );
    };
    xhr.send();
    return true;
};

KSTemplates.put.script = function(commandString, callback) {
    var match = /^put\.script\s*([\s\S]*)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Script Command: " + commandString);

    var scriptURL = match[1];
    var scriptPath = scriptURL.split('?')[0];
    //var args = match[2].split(/\s+/);

    var html_script_options = '';
    self.exports = {};
    importScripts('ks/ks-content-scripts.js');
    var scripts = self.exports.getContentScripts();

    for(var i=0; i<scripts.length; i++) {
        var opts = scripts[i];
        var selectedHTML = '';
        if(scriptPath && scriptPath === opts[0]) {
            selectedHTML = ' selected="selected"';
        }
        html_script_options += "<option value='" + opts[0] + "'" + selectedHTML + ">" + opts[1] + "</option>\n";
    }

    var TEMPLATE_URL = 'ks/templates/ks-put-script-template.html';

    var xhr = new XMLHttpRequest();
    xhr.open("GET", TEMPLATE_URL);
    xhr.onload = function () {
        callback(xhr.responseText
            .replace(/{\$html_script_options}/gi, html_script_options)
        );
    };
    xhr.send();
    return true;
};



// Log Templates

KSTemplates.log = {};
KSTemplates.log.container = function(url, callback) {
    var match = url.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
    var host = match[4];
    if(!host)
        throw new Error("Invalid Host: " + url);

    var TEMPLATE_URL = 'ks/templates/ks-browser-template.html';
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


KSTemplates.log.entry = function(logContent, direction, callback) {
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


KSTemplates.log.action = function(action, callback) {
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


// Browser Template



KSTemplates.browser = function(responseText, callback) {

    var headerBody = responseText;
    var responseBody = '';
    var splitPos = headerBody.indexOf("\n\n");
    if(splitPos !== -1) {
        headerBody = responseText.substr(0, splitPos);
        responseBody = responseText.substr(splitPos).trim();
    }
    var headers = headerBody.split(/\n/);
    var headerFirstLine = headers.shift();
    var headerValues = {};
    for(var i=0; i<headers.length; i++) {
        var splitHeader = headers[i].split(': ');
        headerValues[splitHeader[0].toLowerCase()] = splitHeader.length > 0 ? splitHeader[1] : true;
    }
    var match = /^http\/1.1 (\d+) ?(.*)$/i.exec(headerFirstLine);
    if(!match)
        throw new Error("Invalid HTTP Response: " + headerFirstLine);
    var responseCode = match[1];
    var responseCodeText = match[2];
    var requestURL = headerValues['request-url'];
    if(!requestURL)
        throw new Error("Unknown request-url for response: Header is missing");
    var browserID = headerValues['browser-id'];
    if(!browserID)
        throw new Error("Unknown browser-id for response:\n" + responseText);

    var TEMPLATE_URL = 'ks/templates/ks-browser-template.html';

    var xhr = new XMLHttpRequest();
    xhr.open("GET", TEMPLATE_URL);
    xhr.onload = function () {
        callback(xhr.responseText
            .replace(/{\$response_body}/gi, responseBody)
            .replace(/{\$response_code}/gi, responseCode)
            .replace(/{\$response_text}/gi, responseCodeText)
            .replace(/{\$browser_id}/gi, browserID)
            .replace(/{\$request_url}/gi, requestURL)
        );
    };
    xhr.send();
    //KeySpaceDB.listURLIndex(contentURL, function(urls) {
    //    var pathHTML = "<ul class='path-index'>";
    //
    //    for(var i=0; i<urls.length; i++)
    //        pathHTML += "\t<li><a href='" + urls[i][0] + "'>" + urls[i][1] + "</a></li>";
    //    pathHTML += "</ul>";
    //    TEMPLATE_INDEX = TEMPLATE_INDEX.replace(/{\$html_ul_index}/gi, pathHTML);
    //    callback(TEMPLATE_INDEX);
    //});
    //

    // Callback
    //callback(HTTP_BROWSER_TEMPLATE
    //        .replace(/{\$response_body}/gi, responseBody)
    //        .replace(/{\$response_code}/gi, responseCode)
    //        .replace(/{\$response_text}/gi, responseCodeText)
    //        .replace(/{\$browser_id}/gi, browserID)
    //        .replace(/{\$request_url}/gi, requestURL)
    //);

};


KSTemplates.response = {};
KSTemplates.response.body = function(body, url, code, text, headers, callback) {
    var RESPONSE_BODY_TEMPLATE = "\
HTTP/1.1 {$response_code} {$response_text}\n\
Content-Type: text/html\n\
Content-Length: {$response_length}\n\
Request-URL: {$request_url}\
{$response_headers}\
\n\n\
{$response_body}";

    headers = headers ? "\n" + headers.trim() : '';

    callback(RESPONSE_BODY_TEMPLATE
            .replace(/{\$response_headers}/gi, headers)
            .replace(/{\$response_code}/gi, code || 200)
            .replace(/{\$response_text}/gi, text || 'OK')
            .replace(/{\$request_url}/gi, url)
            .replace(/{\$response_length}/gi, body.length)
            .replace(/{\$response_body}/gi, body),
        code,
        text,
        headers
    );
};

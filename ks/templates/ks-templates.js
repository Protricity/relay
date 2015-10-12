/**
 * Created by ari on 6/19/2015.
 */


var Templates = Templates || {};
Templates.ks = Templates.ks || {};
Templates.ks.put = Templates.ks.put || {};
Templates.ks.put.form = function(content, callback) {
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

Templates.ks.put.preview = function(content, callback) {
    var match = /^put\.template\s*([\s\S]*)$/im.exec(commandString);
    if(!match)
        return false;

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

Templates.ks.put.template = function(commandString, callback, Client) {
    var match = /^put\.template\s*([\s\S]*)$/im.exec(commandString);
    if(!match)
        return false;

    var TEMPLATE_URL = 'ks/templates/ks-put-script-template.html';

    var xhr = new XMLHttpRequest();
    xhr.open("GET", TEMPLATE_URL);
    xhr.onload = function () {
        callback(xhr.responseText
                .replace(/{\$content}/gi, content || '')
        );
    };
    xhr.send();
    return true;
    //
    //var scriptURL = match[1];
    //var scriptPath = scriptURL.split('?')[0];
    ////var args = match[2].split(/\s+/);
    //
    //var PUT_SELECT_TEMPLATE = "\
    //    ";
    //
    //var classes = [];
    //
    //var html_script_options = '';
    //var scripts = Client.require('ks/ks-content-scripts.js').getContentScripts();
    //for(var i=0; i<scripts.length; i++) {
    //    var opts = scripts[i];
    //    var selectedHTML = '';
    //    if(scriptPath && scriptPath === opts[0]) {
    //        selectedHTML = ' selected="selected"';
    //    }
    //    html_script_options += "<option value='" + opts[0] + "'" + selectedHTML + ">" + opts[1] + "</option>\n";
    //}
    //
    //// Callback
    //callback(PUT_SELECT_TEMPLATE
    //        .replace(/{\$classes}/gi, classes ? classes.join(' ') : '')
    //        .replace(/{\$html_script_options}/gi, html_script_options)
    //        .replace(/{\$template_content}/gi, '')
    //);

};


Templates.ks.response = Templates.ks.response || {};
Templates.ks.response.body = function(body, url, code, text, headers, callback) {
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

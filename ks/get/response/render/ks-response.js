/**
 * Created by ari on 7/2/2015.
 */

if(typeof document === 'object')
    (function() {

        // Events

        //self.addEventListener('submit', onFormEvent, false);
        //self.addEventListener('input', onFormEvent, false);
        //self.addEventListener('change', onFormEvent, false);
    })();


// Worker Script
if (!module) var module = {exports:{}};

module.exports.renderResponse = function(body, url, code, text, headers, callback) {
    var RESPONSE_BODY_TEMPLATE =
        "HTTP/1.1 {$response_code} {$response_text}\n" +
        "Content-Type: text/html\n" +
        "Content-Length: {$response_length}\n" +
        "Request-URL: {$request_url}" +
        "{$response_headers}" +
        "\n\n" +
        "{$response_body}";

    headers = headers ? "\n" + headers.trim() : '';
    body = body || '<code>No Body</code>';

    callback(
        RESPONSE_BODY_TEMPLATE
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
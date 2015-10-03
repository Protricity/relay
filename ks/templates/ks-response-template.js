/**
 * Created by ari on 6/19/2015.
 */
var Templates = Templates || {};
Templates.ks = Templates.ks || {};
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

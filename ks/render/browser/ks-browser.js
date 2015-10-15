/**
 * Created by ari on 7/2/2015.
 */

if(typeof document === 'object')
    (function() {

        var REFRESH_TIMEOUT = 200;

        // Events

        self.addEventListener('submit', onFormEvent);
        self.addEventListener('input', onFormEvent);
        self.addEventListener('change', onFormEvent);

        function onFormEvent(e, formElm) {
            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
            if(formElm.nodeName.toLowerCase() !== 'form')
                return false;

            switch(formElm.getAttribute('name')) {
                case 'ks-browser-navigation-form':
                    if(e.type === 'submit')
                        e.preventDefault() ||
                        submitHTTPBrowserNavigationForm(e, formElm);
                    return true;

                default:
                    return false;
            }
        }


        function submitHTTPBrowserNavigationForm(e, formElm) {
            var urlElm = formElm.querySelector('[name=url]');
            if(!urlElm)
                throw new Error("Could not find url input");
            if(!urlElm.value)
                return;

            var browserID = null;
            var targetElm = e.target || formElm;
            while(!browserID && (targetElm = targetElm.parentNode))
                browserID = targetElm.getAttribute('data-browser-id');
            if(!browserID)
                throw new Error("Browser ID not found");

            var commandString = "GET " + urlElm.value;
            commandString = addContentHeader(commandString, 'Browser-ID', browserID);

            var commandEvent = new CustomEvent('command', {
                detail: commandString,
                cancelable: true,
                bubbles: true
            });
            e.target.dispatchEvent(commandEvent);

        }


        function protectHTMLContent(htmlContent) {
            var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
            if(match)
                throw new Error("Dangerous HTML: " + match[2]);

            return htmlContent;
        }

    })();


// Worker Script
else
    (function() {
        var TEMPLATE_URL = 'ks/render/browser/ks-browser.html';

        module.exports.renderBrowser = function(responseText, callback) {
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
    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
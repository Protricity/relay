/**
 * Created by ari ooccurred015.
 */
(function() {

    var PATH_PUT = 'put';
    var PATH_PREFIX_GET = 'get:';

    //<label class='label-recipients show-section-on-value'>Choose which subscribers may view this post:<br/>\n\
    //    <select name='recipients'>\n\
    //        <option value='*'>Everybody</option>\n\
    //        <option disabled='disabled'>My friends</option>\n\
    //        <option disabled='disabled'>Friends of Friends</option>\n\
    //        <option disabled='disabled'>Specific Recipients</option>\n\
    //    </select>\n\
    //<br/><br/></label>\n\


    /**
     *
     * @param commandString PUT [path] [content]
     */
    Client.addCommand(function putCommand(commandString) {
        var match = /^put(?:\s+(\S+))?(?:\s+(\S+))?/im.exec(commandString);
        if(!match)
            return false;

        var path = match[1] || '~';
        var content = match[2] || '';

        var preview = false;
        content = content.replace(/--preview\s+/i, function(match, contents, offset, s) {
            preview = true; return '';
        });

        if(!/[~/a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);

        if(content) {
            // todo http format
            if(preview) {
                importScripts('http/templates/http-put-template.js');
                Templates.rest.put.preview(content, function(html) {
                    Client.postResponseToClient("LOG.REPLACE put-preview: " + html);
                });
                // Free up template resources
                delete Templates.rest.put.preview;

            } else {
                Client.sendWithSocket(commandString);
            }

        } else {
            importScripts('http/templates/http-put-template.js');
            Templates.rest.put.form(content, function(html) {
                Client.postResponseToClient("LOG.REPLACE put: " + html);
            });
            // Free up template resources
            delete Templates.rest.put.form;
        }

        return true;
    });

    Client.addResponse(function(commandString) {
        if(commandString.substr(0,3).toLowerCase() !== 'put')
            return false; // throw new Error("Invalid PUT: " + commandString);
        Client.postResponseToClient(commandString);
        return true;
    });


    /**
     *
     * @param commandString GET [URL]
     */
    Client.addCommand(function (commandString) {
        var match = /^get\s+/i.exec(commandString);
        if(!match)
            return false;

        executeRemoteGETRequest(commandString, function(responseString) {
            renderResponseString(responseString);
        });
    });

// http://521D4941.ks/@pgp/@export
    Client.addResponse(function(requestString) {
        var match = /^get (?:socket:\/\/)?([a-f0-9]{8,})(?:\.ks)(\/@pgp.*)$/i.exec(requestString);
        if(!match)
            return false;

        executeLocalGETRequest(requestString, function(responseString) {
            Client.sendWithSocket(responseString);
        });
        return true;
    });

    // TODO: default content on response http only?
    Client.addResponse(function(responseString) {
        if(responseString.substr(0,4).toLowerCase() !== 'http')
            return false;

        addURLsToDB(responseString);

        var responseCode = getResponseStatus(responseString)[0];
        if(responseCode === 200) {
            renderResponseString(responseString);

        } else {
            var requestURL = getContentHeader(responseString, 'Request-Url');
            if(!requestURL)
                throw new Error("Unknown request-url for response: Header is missing");
            var browserID = getContentHeader(responseString, 'Browser-ID');
            if(!browserID)
                throw new Error("Unknown browser-id for response:\n" + responseString);
            var requestString = "GET " + requestURL + "\n" +
                "Browser-ID: " + browserID + "\n";

            executeLocalGETRequest(requestString, function(responseString, responseCode) {
                if (responseCode === 200) {
                    responseString = protectHTMLContent(responseString);
                    renderResponseString(responseString);

                } else {
                    processResponseWithDefaultContent(responseString, function (responseString) {
                        renderResponseString(responseString);
                    });
                }
            });
        }


        return true;
    });

    function addURLsToDB(responseContent) {
        var referrerURL = getContentHeader(responseContent, 'Request-Url');
        if(!referrerURL)
            throw new Error("Unknown Request-Url for response: Header is missing");

        responseContent.replace(/<a[^>]+href=['"]([^'">]+)['"][^>]*>([^<]+)<\/a>/gi, function(match, url, text, offset, theWholeThing) {
            if(typeof RestDB !== 'function')
                importScripts('http/http-db.js');

            RestDB.addURLToDB(url, referrerURL);
        });
    }

    var httpBrowserID = 1;
    var requestIDCount = 0;
    var pendingGETRequests = {};
    function executeRemoteGETRequest(requestString, callback) {
        var browserID = getContentHeader(requestString, 'Browser-ID');
        if(!browserID)
            requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

        if(typeof RestDB !== 'function')
            importScripts('http/http-db.js');

        // Send request regardless of local cache
        var requestID = 'R' + requestIDCount++;
        requestString = addContentHeader(requestString, 'Request-ID', requestID);
        pendingGETRequests[requestID] = callback; // TODO: reuse same callback? should be fine.
        Client.sendWithSocket(requestString);

        // Check local cache to see what can be displayed while waiting
        var requestURL = getRequestURL(requestString);
        RestDB.getContent(requestURL, function (contentData) {
            if(contentData) {
                var signedBody = protectHTMLContent(contentData.content_verified);

                importScripts('http/templates/http-response-template.js');
                Templates.rest.response.body(
                    signedBody,
                    requestURL,
                    200,
                    "OK",
                    "Browser-ID: " + browserID,
                    function(body, code, text, responseHeaders) {
                        callback('HTTP/1.1 ' + code + ' ' + text + responseHeaders + "\n\n" + body, code, text);
                    }
                );
                // Free up template resources
                delete Templates.rest.response.body;

            } else {
                // If nothing found, show something, sheesh
                importScripts('http/templates/http-response-template.js');
                Templates.rest.response.body(
                    "<p>Request sent...</p>",
                    requestURL,
                    202,
                    "Request Sent",
                    "Browser-ID: " + browserID,
                    function(body, code, text, responseHeaders) {
                        callback('HTTP/1.1 ' + code + ' ' + text + responseHeaders + "\n\n" + body, code, text);
                    }
                );
                // Free up template resources
                delete Templates.rest.response.body;
            }
        });
    }

    function executeLocalGETRequest(requestString, callback) {
        var browserID = getContentHeader(requestString, 'Browser-ID');
        if(!browserID)
            requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

        if(typeof RestDB !== 'function')
            importScripts('http/http-db.js');

        var requestURL = getRequestURL(requestString);
        RestDB.getContent(requestURL, function (contentData) {
            if(contentData) {
                var signedBody = protectHTMLContent(contentData.content_verified);

                importScripts('http/templates/http-response-template.js');
                Templates.rest.response.body(
                    signedBody,
                    requestURL,
                    200,
                    "OK",
                    "Browser-ID: " + browserID,
                    function(body, code, text, responseHeaders) {
                        callback('HTTP/1.1 ' + code + ' ' + text + responseHeaders + "\n\n" + body, code, text);
                    }
                );
                // Free up template resources
                delete Templates.rest.response.body;

            } else {

                importScripts('rest/pages/404.js');
                get404IndexTemplate(requestString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                    importScripts('http/templates/http-response-template.js');
                    Templates.rest.response.body(
                        defaultResponseBody,
                        requestURL,
                        responseCode,
                        responseText,
                        (responseHeaders + "\nBrowser-ID: " + browserID).trim(),
                        function(body, code, text, responseHeaders) {
                            callback('HTTP/1.1 ' + code + ' ' + text + responseHeaders + "\n\n" + body, code, text);
                        }
                    );
                    // Free up template resources
                    delete Templates.rest.response.body;
                });

            }
        });
    }


    function processResponseWithDefaultContent(responseString, callback) {
        var responseCode = getResponseStatus(responseString)[0];

        if(responseCode === 200) {
            callback(responseString);

        } else {
            var requestURL = getContentHeader(responseString, 'Request-Url');
            if(!requestURL)
                throw new Error("Unknown request-url for response: Header is missing");
            var browserID = getContentHeader(responseString, 'Browser-ID');
            if(!browserID)
                throw new Error("Unknown browser-id for response:\n" + responseString);
            var requestString = "GET " + requestURL + "\n" +
                "Browser-ID: " + browserID + "\n";

            // Non-200 so grab local version or default content
            getDefaultContentResponse(requestString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                importScripts('http/templates/http-response-template.js');
                Templates.rest.response.body(
                    defaultResponseBody,
                    requestURL,
                    responseCode,
                    responseText,
                    (responseHeaders + "\nBrowser-ID: " + browserID).trim(),
                    function(body, code, text, responseHeaders) {
                        callback('HTTP/1.1 ' + code + ' ' + text + responseHeaders + "\n\n" + body, code, text);
                    }
                );
                // Free up template resources
                delete Templates.rest.response.body;
            });
        }

    }

    // TODO default content public config
    var defaultContentResponses = [
        [/^\/?home\/?$/i, function(commandString, callback) { importScripts('rest/pages/home/user-index.js'); getUserIndexTemplate(commandString, callback); }],
        [/^\/?$/, function(commandString, callback) { importScripts('rest/pages/index.js'); getRootIndexTemplate(commandString, callback); }]
    ];
    var getDefaultContentResponse = function(requestString, callback) {
        var requestURL = getRequestURL(requestString);
        var urlData = parseURL(requestURL);
        if(urlData.path === '~')
            urlData.path = '~/';

        var browserID = getContentHeader(requestString, 'Browser-ID');
        if(!browserID)
            throw new Error("No Browser-ID Header");

        function fixedCallback(defaultResponseBody, responseCode, responseText, responseHeaders) {
            return callback(defaultResponseBody,
                responseCode,
                responseText,
                addContentHeader(responseHeaders, 'Browser-ID', browserID)
            );
        }


        for(var i=0; i<defaultContentResponses.length; i++) {
            //console.log(defaultContentResponses[i], contentURLPath, contentURL);
            if(defaultContentResponses[i][0].test(urlData.path)) {
                defaultContentResponses[i][1](requestString, fixedCallback);
                return;
            }
        }

        importScripts('rest/pages/404.js');
        get404IndexTemplate(requestString, fixedCallback);
    };

    function renderResponseString(responseString) {
        var requestURL = getContentHeader(responseString, 'Request-URL');
        if(!requestURL)
            throw new Error("Unknown request-url for response: Header is missing");

        //var urlData = parseURL(requestURL);
        //if(!urlData.host)
        //    throw new Error("Invalid Host: " + requestURL);

        var browserID = getContentHeader(responseString, 'Request-URL');
        if(!browserID)
            throw new Error("Invalid Browser ID");

        importScripts('http/templates/test-browser-template.js');
        Templates.rest.browser(responseString, function(html) {
            Client.postResponseToClient("LOG.REPLACE http-browser:" + browserID + ' ' + html);
        });
        // Free up template resources
        delete Templates.rest.browser;
    }

    function protectHTMLContent(htmlContent) {
        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match)
            throw new Error("Dangerous HTML: " + match[2]);

        return htmlContent;
    }

    // Request/Response methods

    function parseURL(url) {
        var matches = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(url);
        return {url: url, scheme: matches[2], host: matches[4], path: matches[5] || '', query: matches[7], fragment: matches[9]};
    }

    function getResponseStatus(responseString) {
        var match = /^http\/1.1 (\d+) ?(.*)$/im.exec(responseString);
        if(!match)
            throw new Error("Invalid HTTP Response: " + responseString);
        return [parseInt(match[1]), match[2]];
    }

    function getRequestURL(requestString) {
        var firstLine = requestString.split(/\n/)[0];
        var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/i.exec(firstLine);
        if(!match)
            throw new Error("Invalid GET Request: " + requestString);
        return match[1];
    }

    function getContentHeader(contentString, headerName) {
        var match = new RegExp('^' + headerName + ': ([^$]+)$', 'mi').exec(contentString.split(/\n\n/)[0]);
        if(!match)
            return null;
        return match[1];
    }

    function addContentHeader(contentString, headerName, headerValue) {
        if(getContentHeader(contentString, headerName))
            throw new Error("Content already has Header: " + headerName);
        var lines = contentString.split(/\n/);
        lines.splice(lines.length >= 1 ? 1 : 0, 0, headerName + ": " + headerValue);
        return lines.join("\n");
    }




})();

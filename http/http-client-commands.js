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
    Client.addCommand(function (commandString) {
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


    var httpBrowserID = 1;
    /**
     *
     * @param commandString GET [URL]
     */
    Client.addCommand(function (commandString) {
        var match = /^get\s+/i.exec(commandString);
        if(!match)
            return false;

        executeGETRequest(commandString, function(responseText) {
            renderResponseText(responseText);
        });
    });

// http://521D4941.ks/@pgp/@export
    Client.addResponse(function(responseString) {
        var match = /^get (?:socket:\/\/)?([a-f0-9]{8,})(?:\.ks)(\/@pgp.*)$/i.exec(responseString);
        if(!match)
            return false;

        executeGETRequest(responseString, function(responseText) {
            Client.sendWithSocket(responseText);
        }, true, true);
        return true;
    });

    Client.addResponse(function(responseString) {
        if(responseString.substr(0,4).toLowerCase() !== 'http')
            return false;

        addURLsToDB(responseString);

        var responseData = parseResponseText(responseString);
        var requestURL = responseData.headers['request-url'];
        if(!requestURL)
            throw new Error("Unknown request-url for response: Header is missing");
        var browserID = responseData.headers['browser-id'];
        if(!browserID)
            throw new Error("Unknown browser-id for response:\n" + responseString);
        var commandString = "GET " + requestURL + "\n" +
            "Browser-ID: " + browserID + "\n";
        if(responseData.code === 404) {
            // 404 so grab default content, grab default content
            executeGETRequest(commandString, function(responseText) {
                renderResponseText(responseText);
            }, true);

        } else {
            renderResponseText(responseString);
        }

        return true;
    });

    function addURLsToDB(httpResponseText) {
        var responseData = parseResponseText(httpResponseText);
        var referrerURL = responseData.headers['request-url'];
        if(!referrerURL)
            throw new Error("Unknown request-url for response: Header is missing");

        responseData.body.replace(/<a[^>]+href=['"]([^'">]+)['"][^>]*>([^<]+)<\/a>/gi, function(match, url, text, offset, theWholeThing) {
            if(typeof RestDB !== 'function')
                importScripts('http/http-db.js');

            RestDB.addURLToDB(url, referrerURL);
        });
    }


    var requestIDCount = 0;
    var pendingGETRequests = {};
    function executeGETRequest(requestString, callback, local_only, skip_default_content) {
        var requestData = parseRequestString(requestString);
        var browserID = requestData.headers['browser-id'] || (function() {
            browserID = requestData.headers['browser-id'] = httpBrowserID++;
            requestData.headersString = (requestData.headersString + "\nBrowser-ID: " + browserID).trim();
            requestString = "GET " + requestData.url + " " + requestData.http_version + "\n" + requestData.headersString;
            return browserID;
        })();

        if(typeof RestDB !== 'function')
            importScripts('http/http-db.js');

        RestDB.getContent(requestData.url, function (contentData) {
            if(contentData) {
                var signedBody = protectHTMLContent(contentData.content_verified);

                importScripts('http/templates/http-response-template.js');
                Templates.rest.response.body(
                    signedBody,
                    requestData.url,
                    200,
                    "OK",
                    "Browser-ID: " + browserID,
                    callback
                );
                // Free up template resources
                delete Templates.rest.response.body;

            } else {
                if(local_only) {
                    // No content found locally, grab default content
                    if(skip_default_content) {

                        importScripts('rest/pages/404.js');
                        get404IndexTemplate(requestString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                            importScripts('http/templates/http-response-template.js');
                            Templates.rest.response.body(
                                defaultResponseBody,
                                requestData.url,
                                responseCode,
                                responseText,
                                (responseHeaders + "\nBrowser-ID: " + browserID).trim(),
                                callback);
                            // Free up template resources
                            delete Templates.rest.response.body;
                        });

                    } else {
                        getDefaultContentResponse(requestString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {

                            defaultResponseBody = protectHTMLContent(defaultResponseBody);

                            importScripts('http/templates/http-response-template.js');
                            Templates.rest.response.body(
                                defaultResponseBody,
                                requestData.url,
                                responseCode,
                                responseText,
                                (responseHeaders + "\nBrowser-ID: " + browserID).trim(),
                                callback);
                            // Free up template resources
                            delete Templates.rest.response.body;
                        });
                    }

                } else {
                    // If no local cache exists, request content from server
                    var requestID = 'R' + requestIDCount++;
                    pendingGETRequests[requestID] = callback;
                    requestData.headers["Request-ID"] = requestID;
                    requestData.headersString = (requestData.headersString + "\nRequest-ID: " + requestID).trim();
                    requestString = "GET " + requestData.url + " " + requestData.http_version + "\n" + requestData.headersString;
                    Client.sendWithSocket(requestString);

                    // Show something, sheesh
                    importScripts('http/templates/http-response-template.js');
                    Templates.rest.response.body(
                        "<p>Request sent...</p>",
                        requestData.url,
                        200,
                        "Request Sent",
                        "Browser-ID: " + browserID,
                        renderResponseText
                    );
                    // Free up template resources
                    delete Templates.rest.response.body;
                }
            }
        });
    }

    // TODO default content public config
    var defaultContentResponses = [
        [/^\/?home\/?$/i, function(commandString, callback) { importScripts('rest/pages/home/user-index.js'); getUserIndexTemplate(commandString, callback); }],
        [/^\/?$/, function(commandString, callback) { importScripts('rest/pages/index.js'); getRootIndexTemplate(commandString, callback); }]
    ];
    var getDefaultContentResponse = function(requestString, callback) {
        var requestData = parseRequestString(requestString);
        var urlData = parseURL(requestData.url);
        var browserID = requestData.headers['browser-id'];

        function fixedCallback(defaultResponseBody, responseCode, responseText, responseHeaders) {
            responseHeaders = (responseHeaders ? responseHeaders + "\n" : "") +
            "Browser-ID: " + browserID;
            return callback(defaultResponseBody, responseCode, responseText, responseHeaders);
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

    function parseResponseText(responseText) {
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
        var responseCode = parseInt(match[1]);
        var responseCodeText = match[2];
        return {
            body: responseBody,
            code: responseCode,
            text: responseCodeText,
            headers: headerValues,
            header_body: headerBody
        }
    }

    function renderResponseText(responseText) {
        var response = parseResponseText(responseText);
        var requestUrl = response.headers['request-url'];
        if(!requestUrl)
            throw new Error("Unknown request-url for response: Header is missing");

        var urlData = parseURL(requestUrl);
        if(!urlData.host)
            throw new Error("Invalid Host: " + requestUrl);

        var browserID = response.headers['browser-id'];
        if(!browserID)
            throw new Error("Invalid Browser ID");

        importScripts('http/templates/test-browser-template.js');
        Templates.rest.browser(responseText, function(html) {
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

    function parseRequestString(requestString) {
        var headers = requestString.split(/\n/);
        var firstLine = headers.shift();
        var headerValues = {};
        for(var i=0; i<headers.length; i++) {
            var splitHeader = headers[i].split(': ');
            headerValues[splitHeader[0].toLowerCase()] = splitHeader.length > 0 ? splitHeader[1] : true;
        }
        var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/i.exec(firstLine);
        if(!match)
            throw new Error("Invalid GET Request: " + requestString);
        return {
            url: match[1],
            http_version: match[2] || 'HTTP/1.1',
            headers: headerValues,
            headersString: headers.join("\n")
        };
    }

    function parseURL(url) {
        var pattern = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
        var matches = url.match(pattern);
        var data = {
            url: url,
            scheme: matches[2],
            host: matches[4],
            path: matches[5] || '',
            query: matches[7],
            fragment: matches[9],
            is_local: false
        };
        if(data.path === '~')
            data.path = '~/';
        return data;
    }





})();

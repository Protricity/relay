/**
 * Created by ari ooccurred015.
 */
if(!exports) var exports = {};
(function() {
    if(typeof Client === 'undefined')
        var Client = exports.Client
            || require('../client/client.js').Client;

    Client.addCommand(putCommand);
    Client.addCommand(getCommand);

    Client.addResponse(putResponse);
    Client.addResponse(getResponse);
    Client.addResponse(httpResponse);
    Client.addResponse(ksChallengeResponse);

    /**
     *
     * @param commandString PUT [path] [content]
     */
    function putCommand(commandString) {
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
                importScripts('ks/templates/ks-put-template.js');
                Templates.ks.put.preview(content, function(html) {
                    Client.postResponseToClient("LOG.REPLACE put-preview: " + html);
                });
                // Free up template resources
                delete Templates.ks.put.preview;

            } else {
                Client.sendWithSocket(commandString);
            }

        } else {
            importScripts('ks/templates/ks-put-template.js');
            Templates.ks.put.form(content, function(html) {
                Client.postResponseToClient("LOG.REPLACE put: " + html);
            });
            // Free up template resources
            delete Templates.ks.put.form;
        }

        return true;
    }

    function putResponse(commandString) {
        if(commandString.substr(0,3).toLowerCase() !== 'put')
            return false; // throw new Error("Invalid PUT: " + commandString);
        Client.postResponseToClient(commandString);
        return true;
    }


    /**
     *
     * @param commandString GET [URL]
     */
    function getCommand(commandString) {
        var match = /^get\s+/i.exec(commandString);
        if(!match)
            return false;

        executeRemoteGETRequest(commandString, function(responseString) {
            renderResponseString(responseString);
        });
    }

    function getResponse(requestString) {
        var match = /^get/i.exec(requestString); // (?:\w+:\/\/)?([a-f0-9]{8,})(?:\.ks)(\/@pgp.*)$
        if(!match)
            return false;

        executeLocalGETRequest(requestString, function(responseString) {
            Client.sendWithSocket(responseString);
        });
        return true;
    }

    // TODO: default content on response http only?
    function httpResponse(responseString) {
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
            var requestString = "GET " + requestURL +
                "\nBrowser-ID: " + browserID + "\n";

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
    }

    function addURLsToDB(responseContent) {
        var referrerURL = getContentHeader(responseContent, 'Request-Url');
        if(!referrerURL)
            throw new Error("Unknown Request-Url for response: Header is missing");

        responseContent.replace(/<a[^>]+href=['"]([^'">]+)['"][^>]*>([^<]+)<\/a>/gi, function(match, url, text, offset, theWholeThing) {
            getKeySpaceDB().addURLToDB(url, referrerURL);
        });
    }

    var httpBrowserID = 1;
    var requestIDCount = 0;
    var pendingGETRequests = {};
    function executeRemoteGETRequest(requestString, callback) {
        var browserID = getContentHeader(requestString, 'Browser-ID');
        if(!browserID)
            requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

        // Send request regardless of local cache
        var requestID = 'C' + requestIDCount++;
        requestString = addContentHeader(requestString, 'Request-ID', requestID);
        pendingGETRequests[requestID] = callback; // TODO: reuse same callback? should be fine.
        Client.sendWithSocket(requestString);

        // Check local cache to see what can be displayed while waiting
        var requestURL = getRequestURL(requestString);
        var passedResponseHeaders = "\nBrowser-ID: " + browserID;
        passedResponseHeaders += "\nRequest-ID: " + requestID;

        logKSRequest(requestURL, 'O');
        getKeySpaceDB().queryContent(requestURL, function (err, contentData) {
            if(err)
                throw new Error(err);

            if(contentData) {
                // TODO: verify and decrypt content on the fly?
                var signedBody = protectHTMLContent(contentData.content_verified);

                importScripts('ks/templates/ks-response-template.js');
                Templates.ks.response.body(
                    signedBody,
                    requestURL,
                    200,
                    "OK",
                    passedResponseHeaders,
                    callback
                );
                // Free up template resources
                delete Templates.ks.response.body;

            } else {
                // If nothing found, show something, sheesh
                importScripts('ks/templates/ks-response-template.js');
                Templates.ks.response.body(
                    "<p>Request sent...</p>",
                    requestURL,
                    202,
                    "Request Sent",
                    passedResponseHeaders,
                    callback
                );
                // Free up template resources
                delete Templates.ks.response.body;
            }
        });
    }

    function executeLocalGETRequest(requestString, callback) {
        var browserID = getContentHeader(requestString, 'Browser-ID');
        if(!browserID)
            requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

        var requestURL = getRequestURL(requestString);
        var requestID = getContentHeader(requestString, 'Request-ID');
        var passedResponseHeaders = "\nBrowser-ID: " + browserID;
        if(requestID)
            passedResponseHeaders += "\nRequest-ID: " + requestID;
        logKSRequest(requestURL, 'I');
        getKeySpaceDB().queryContent(requestURL, function (err, contentData) {
            if(err)
                throw new Error(err);

            if(contentData) {
                // TODO: verify and decrypt content on the fly? Maybe don't verify things being sent out

                importScripts('ks/templates/ks-response-template.js');
                Templates.ks.response.body(
                    contentData.content,
                    requestURL,
                    200,
                    "OK",
                    passedResponseHeaders,
                    callback
                );
                // Free up template resources
                delete Templates.ks.response.body;

            } else {

                importScripts('ks/pages/404.js');
                get404IndexTemplate(requestString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                    responseHeaders += passedResponseHeaders;

                    importScripts('ks/templates/ks-response-template.js');
                    Templates.ks.response.body(
                        defaultResponseBody,
                        requestURL,
                        responseCode,
                        responseText,
                        responseHeaders,
                        callback
                    );
                    // Free up template resources
                    delete Templates.ks.response.body;
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
            var requestString = addContentHeader("GET " + requestURL, "Browser-ID", browserID);

            // Non-200 so grab local version or default content
            getDefaultContentResponse(requestString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                responseHeaders += "\nBrowser-ID: " + browserID;

                importScripts('ks/templates/ks-response-template.js');
                Templates.ks.response.body(
                    defaultResponseBody,
                    requestURL,
                    responseCode,
                    responseText,
                    responseHeaders,
                    callback
                );
                // Free up template resources
                delete Templates.ks.response;
            });
        }

    }

    // TODO default content public config
    var defaultContentResponses = [
        [/^\/?home\/?$/i, function(commandString, callback) { importScripts('ks/pages/home/user-index.js'); getUserIndexTemplate(commandString, callback); }],
        [/^\/?$/, function(commandString, callback) { importScripts('ks/pages/index.js'); getRootIndexTemplate(commandString, callback); }]
    ];
    var getDefaultContentResponse = function(requestString, callback) {
        var requestURL = getRequestURL(requestString);
        var match = requestURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var path = match[5] || '';
        if(path === '~')
            path = '~/';

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
            if(defaultContentResponses[i][0].test(path)) {
                defaultContentResponses[i][1](requestString, fixedCallback);
                return;
            }
        }

        importScripts('ks/pages/404.js');
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

        importScripts('ks/templates/ks-browser-template.js');
        Templates.ks.browser(responseString, function(html) {
            Client.postResponseToClient("LOG.REPLACE ks-browser:" + browserID + ' ' + html);
        });
        // Free up template resources
        delete Templates.ks.browser;
    }

    function protectHTMLContent(htmlContent) {
        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match)
            throw new Error("Dangerous HTML: " + match[2]);

        return htmlContent;
    }

    var logContainerActive = false;
    var logKSRequest = function(requestURL, dir) {
        var match = requestURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var host = match[4];
        if(!host)
            throw new Error("Invalid Host: " + requestURL);

        if(!logContainerActive) {
            logContainerActive = true;
            importScripts('ks/templates/ks-log-template.js');
            Templates.ks.log.container(requestURL, function (html) {
                Client.postResponseToClient("LOG.REPLACE ks-log:" + host + " " + html);
            });
        }

        var requestURLAnchorHTML = "<a href='" + requestURL + "'>" + requestURL + "</a>";
        Templates.ks.log.entry(requestURLAnchorHTML, dir, function(html) {
            Client.postResponseToClient("LOG ks-log-content:" + host + " " + html);
        });
    };

    // Request/Response methods

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

    function getKeySpaceDB() {
        if(typeof self.KeySpaceDB === 'undefined') {
            if(typeof importScripts === "function")
                importScripts('ks/ks-db.js');
            else
                self.KeySpaceDB = require('./ks-db.js').KeySpaceDB;
        }
        return self.KeySpaceDB;
    }
    //
    //function parseURL(url) {
    //    var matches = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(url);
    //    return {
    //        url: url,
    //        scheme: matches[2],
    //        host: matches[4],
    //        path: matches[5] || '',
    //        query: matches[7],
    //        fragment: matches[9]
    //    };
    //}

    exports.test = function() {
        putCommand();
        console.log('Test Complete: ' + __filename);
    };

})();

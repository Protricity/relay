/**
 * Created by ari.
 */

if(typeof module === 'object') (function() {
    module.exports.initClientKSGetCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(getCommand);
        ClientWorkerThread.addResponse(getResponse);
        ClientWorkerThread.addResponse(httpResponse); // Not an Alias for GET response. Handles requests sent by the client

        /**
         *
         * @param commandString GET [URL]
         */
        function getCommand(commandString) {
            var match = /^get\s+/i.exec(commandString);
            if (!match)
                return false;

            executeRemoteGETRequest(commandString, function (responseString) {
                renderResponseString(responseString);
            });
            return true;
        }

        function getResponse(requestString) {
            var match = /^get/i.exec(requestString); // (?:\w+:\/\/)?([a-f0-9]{8,})(?:\.ks)(\/@pgp.*)$
            if (!match)
                return false;

            executeLocalGETRequest(requestString, function (responseString) {
                ClientWorkerThread.sendWithSocket(responseString);
            });
            return true;
        }

        // TODO: default content on response http only?
        function httpResponse(responseString) {
            var match = /^http\/1.1 (\d+)\s?([\w ]*)/i.exec(responseString);
            if (!match)
                return false;

            var responseCode = parseInt(match[1]);
            var responseMessage = match[2];

            var pos = responseString.indexOf("\n\n");
            var responseHeaders = responseString;
            var responseBody = null;
            if(pos > 0) {
                responseHeaders = responseString.substr(0, pos);
                responseBody = responseString.substr(pos+2);
            }

            var headerLines = responseHeaders.split(/\n/g);
            var firstLine = headerLines.shift();

            //addURLsToDB(responseString);

            if (responseCode === 200) {

                self.module = {exports: {}};
                importScripts('keyspace/ks-db.js');
                var KeySpaceDB = self.module.exports.KeySpaceDB;

                self.module = {exports: self.exports = {}};
                importScripts('pgp/lib/openpgpjs/openpgp.js');
                var openpgp = self.module.exports;

                KeySpaceDB.verifyAndAddContent(openpgp, responseBody, null, function(err, insertedData) {
                    console.log(err, insertedData);
                });

                // TODO: Auto Render? Handle in browser handler
                //renderResponseString(responseString);
            } else {
                //throw new Error("TODO: 404");
                var requestURL = getContentHeader(responseString, 'Request-Url');
                if (!requestURL)
                    throw new Error("Unknown request-url for response: Header is missing");
                var browserID = getContentHeader(responseString, 'Browser-ID');
                if (!browserID)
                    throw new Error("Unknown browser-id for response:\n" + responseString);
                var requestString = "GET " + requestURL +
                    "\nBrowser-ID: " + browserID + "\n";

                executeLocalGETRequest(requestString, function (responseString, responseCode) {
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


        //function addURLsToDB(responseContent) {
        //    var referrerURL = getContentHeader(responseContent, 'Request-Url');
        //    if(!referrerURL)
        //        throw new Error("Unknown Request-Url for response: Header is missing");
        //
        //    self.module = {exports: {}};
        //    importScripts('keyspace/ks-db.js');
        //    var KeySpaceDB = self.module.exports.KeySpaceDB;
        //
        //    responseContent.replace(/<a[^>]+href=['"]([^'">]+)['"][^>]*>([^<]+)<\/a>/gi, function(match, url, text, offset, theWholeThing) {
        //        KeySpaceDB.addURLToDB(url, referrerURL);
        //    });
        //}

        var httpBrowserID = 1;
        var requestIDCount = 0;
        var pendingGETRequests = {};

        function executeRemoteGETRequest(requestString, callback) {
            var browserID = getContentHeader(requestString, 'Browser-ID');
            if (!browserID)
                requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

            // Send request regardless of local cache
            var requestID = 'C' + requestIDCount++;
            requestString = addContentHeader(requestString, 'Request-ID', requestID);
            pendingGETRequests[requestID] = callback; // TODO: reuse same callback? should be fine.
            ClientWorkerThread.sendWithSocket(requestString);

            // Check local cache to see what can be displayed while waiting
            var requestURL = getRequestURL(requestString);
            if(!requestURL)
                throw new Error("Invalid Request:\n" + requestString);
            var passedResponseHeaders = "\nBrowser-ID: " + browserID;
            passedResponseHeaders += "\nRequest-ID: " + requestID;

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            logKSRequest(requestURL, 'O');
            KeySpaceDB.queryOne(requestURL, function (err, contentData) {
                if (err)
                    throw new Error(err);

                if (contentData) {
                    // TODO: verify and decrypt content on the fly?
                    var signedBody = protectHTMLContent(contentData.content);

                    self.module = {exports: {}};
                    importScripts('keyspace/get/response/render/ks-response.js');
                    self.module.exports.renderResponse(
                        signedBody,
                        requestURL,
                        200,
                        "OK",
                        passedResponseHeaders,
                        callback
                    );

                } else {
                    // If nothing found, show something, sheesh
                    self.module = {exports: {}};
                    importScripts('keyspace/get/response/render/ks-response.js');
                    self.module.exports.renderResponse(
                        "<p>Request sent...</p>",
                        requestURL,
                        202,
                        "Request Sent",
                        passedResponseHeaders,
                        callback
                    );
                }
            });
        }

        function executeLocalGETRequest(requestString, callback) {
            var browserID = getContentHeader(requestString, 'Browser-ID');
            if (!browserID)
                requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

            var requestURL = getRequestURL(requestString);
            var requestID = getContentHeader(requestString, 'Request-ID');
            var passedResponseHeaders = "\nBrowser-ID: " + browserID;
            if (requestID)
                passedResponseHeaders += "\nRequest-ID: " + requestID;
            logKSRequest(requestURL, 'I');

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            KeySpaceDB.queryOne(requestURL, function (err, contentData) {
                if (err)
                    throw new Error(err);

                if (contentData) {
                    // TODO: verify and decrypt content on the fly? Maybe don't verify things being sent out

                    self.module = {exports: {}};
                    importScripts('keyspace/get/response/render/ks-response.js');
                    self.module.exports.renderResponse(
                        contentData.content,
                        requestURL,
                        200,
                        "OK",
                        passedResponseHeaders,
                        callback
                    );

                } else {

                    self.module = {exports: {}};
                    importScripts('keyspace/get/response/pages/404.js');
                    self.module.exports.set404IndexTemplate(requestString, function (defaultResponseBody, responseCode, responseText, responseHeaders) {
                        responseHeaders += passedResponseHeaders;

                        self.module = {exports: {}};
                        importScripts('keyspace/get/response/render/ks-response.js');
                        self.module.exports.renderResponse(
                            defaultResponseBody,
                            requestURL,
                            responseCode,
                            responseText,
                            responseHeaders,
                            callback
                        );
                    });

                }
            });
        }


        function processResponseWithDefaultContent(responseString, callback) {
            var responseCode = getResponseStatus(responseString)[0];

            if (responseCode === 200) {
                callback(responseString);

            } else {
                var requestURL = getContentHeader(responseString, 'Request-Url');
                if (!requestURL)
                    throw new Error("Unknown request-url for response: Header is missing");
                var browserID = getContentHeader(responseString, 'Browser-ID');
                if (!browserID)
                    throw new Error("Unknown browser-id for response:\n" + responseString);
                var requestString = addContentHeader("GET " + requestURL, "Browser-ID", browserID);

                // Non-200 so grab local version or default content
                getDefaultContentResponse(requestString, function (defaultResponseBody, responseCode, responseText, responseHeaders) {
                    responseHeaders += "\nBrowser-ID: " + browserID;

                    self.module = {exports: {}};
                    importScripts('keyspace/get/response/render/ks-response.js');
                    self.module.exports.renderResponse(
                        defaultResponseBody,
                        requestURL,
                        responseCode,
                        responseText,
                        responseHeaders,
                        callback
                    );
                });
            }

        }

        // TODO default content public config
        var defaultContentResponses = [
            [/^\/?home\/?$/i, function (commandString, callback) {
                importScripts('keyspace/get/response/pages/home/user-index.js');
                getUserIndexTemplate(commandString, callback);
            }],
            [/^\/?$/, function (commandString, callback) {
                importScripts('keyspace/get/response/pages/index.js');
                getRootIndexTemplate(commandString, callback);
            }]
        ];
        var getDefaultContentResponse = function (requestString, callback) {
            var requestURL = getRequestURL(requestString);
            var match = requestURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
            var path = match[5] || '';
            if (path === '~')
                path = '~/';

            var browserID = getContentHeader(requestString, 'Browser-ID');
            if (!browserID)
                throw new Error("No Browser-ID Header");

            function fixedCallback(defaultResponseBody, responseCode, responseText, responseHeaders) {
                return callback(defaultResponseBody,
                    responseCode,
                    responseText,
                    addContentHeader(responseHeaders, 'Browser-ID', browserID)
                );
            }


            for (var i = 0; i < defaultContentResponses.length; i++) {
                //console.log(defaultContentResponses[i], contentURLPath, contentURL);
                if (defaultContentResponses[i][0].test(path)) {
                    defaultContentResponses[i][1](requestString, fixedCallback);
                    return;
                }
            }

            importScripts('keyspace/get/response/pages/404.js');
            get404IndexTemplate(requestString, fixedCallback);
        };

        function renderResponseString(responseString) {
            var requestURL = getContentHeader(responseString, 'Request-URL');
            if (!requestURL)
                throw new Error("Unknown request-url for response: Header is missing");

            //var urlData = parseURL(requestURL);
            //if(!urlData.host)
            //    throw new Error("Invalid Host: " + requestURL);

            var browserID = getContentHeader(responseString, 'Request-URL');
            if (!browserID)
                throw new Error("Invalid Browser ID");

            self.module = {exports: {}};
            importScripts('keyspace/get/browser/render/ks-browser.js');
            self.module.exports.renderBrowser(responseString, function (html) {
                Client.render(html);
            });
        }

        function protectHTMLContent(htmlContent) {
            var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
            if (match)
                throw new Error("Dangerous HTML: " + match[2]);

            return htmlContent;
        }

        var logKSRequest = function (requestURL, dir) {
            var match = requestURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
            var host = match[4];
            if (!host)
                throw new Error("Invalid Host: " + requestURL);

            ClientWorkerThread.log(
                "<span class='direction'>O</span>: " +
                "<span class='request'><a href='" + requestURL + "'>" + requestURL + "</a></span>: "
            );
        };

        // Request/Response methods

        function getResponseStatus(responseString) {
            var match = /^http\/1.1 (\d+) ?(.*)$/im.exec(responseString);
            if (!match)
                throw new Error("Invalid HTTP Response: " + responseString);
            return [parseInt(match[1]), match[2]];
        }

        function getRequestURL(requestString) {
            var firstLine = requestString.split(/\n/)[0];
            var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/i.exec(firstLine);
            if (!match)
                throw new Error("Invalid GET Request: " + requestString);
            return match[1];
        }

        function getContentHeader(contentString, headerName) {
            var match = new RegExp('^' + headerName + ': ([^$]+)$', 'mi').exec(contentString.split(/\n\n/)[0]);
            if (!match)
                return null;
            return match[1];
        }

        function addContentHeader(contentString, headerName, headerValue) {
            if (getContentHeader(contentString, headerName))
                throw new Error("Content already has Header: " + headerName);
            var lines = contentString.split(/\n/);
            lines.splice(lines.length >= 1 ? 1 : 0, 0, headerName + ": " + headerValue);
            return lines.join("\n");
        }


    };
})();
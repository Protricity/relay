/**
 * Created by ari ooccurred015.
 */
(function() {

    var PATH_PREFIX_PUT = 'put:';
    var PATH_PREFIX_GET = 'get:';

    importScripts("rest/rest-templates.js");

    //<label class='label-recipients show-section-on-value'>Choose which subscribers may view this post:<br/>\n\
    //    <select name='recipients'>\n\
    //        <option value='*'>Everybody</option>\n\
    //        <option disabled='disabled'>My friends</option>\n\
    //        <option disabled='disabled'>Friends of Friends</option>\n\
    //        <option disabled='disabled'>Specific Recipients</option>\n\
    //    </select>\n\
    //<br/><br/></label>\n\

    var httpBrowserID = 1;
    var putFormCounterN = 0;
    /**
     *
     * @param commandString PUT [path] [content]
     */
    socketCommands.put = function (commandString) {
        var match = /^put\s*(\S*)\s*([\S\s]*)?$/im.exec(commandString);

        var path = match[1] || '~';
        var content = match[2];

        if(!/[~/a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);

        if(content) {
            // todo http format
            self.sendWithFastestSocket(commandString);

        } else {
            restPutFormTemplate(content, function(html) {
                self.routeResponseToClient("LOG.REPLACE " + PATH_PREFIX_PUT + ' * ' + html);
            });
        }


    };

    socketResponses.put = function(commandString) { return self.routeResponseToClient(commandString); };

    /**
     *
     * @param commandString GET [URL]
     */
    socketCommands.get = function (commandString) {
        var requestData = parseRequestBody(commandString);
        if(!requestData.headers['browser-id'])
            requestData.headers['browser-id'] = httpBrowserID++;


        parseURLWithDefaultHost(requestData.url, function(parsedUrlData) {
            var formattedCommandString = "GET " + parsedUrlData.url_fixed + " " + requestData.http_version + requestData.createRequestHeaderString();
            if(parsedUrlData.is_local) {
                // If local, output content to client
                executeLocalGETRequest(formattedCommandString, function(responseText) {
                    renderResponseText(responseText);
                });

            } else {
                // If remote, request content from server
                self.sendWithFastestSocket(formattedCommandString);

                // Show something, sheesh
                templateRestResponseBody(
                    "<p>Request sent...</p>",
                    requestData.url,
                    200,
                    "Request Sent",
                    requestData.createResponseHeaderString(),
                    function(html) {
                        renderResponseText(html);
                    }
                );

            }
        }, function(err) {
            templateRestResponseBody(
                '',
                requestData.url,
                400,
                "Missing Default PGP Identity: " + err,
                requestData.createResponseHeaderString(),
                function(html) {
                    renderResponseText(html);
                }
            );

        });
    };

    socketResponses.get = function(requestResponseString) {

        executeLocalGETRequest(requestResponseString, function(responseText) {
            self.sendWithFastestSocket(responseText);
        });
    };

    socketResponses.http = function(httpResponseText) {
        parseResponseURLs(httpResponseText);
        var responseData = parseResponseText(httpResponseText);
        var requestURL = responseData.headers['request-url'];
        if(!requestURL)
            throw new Error("Unknown request-url for response: Header is missing");
        var browserID = responseData.headers['browser-id'];
        if(!browserID)
            throw new Error("Unknown browser-id for response:\n" + httpResponseText);
        var commandString = "GET " + requestURL + "\n" +
            "Browser-ID: " + browserID + "\n";
        if(responseData.code === 404) {
            executeLocalGETRequest(commandString, function(responseText) {
                renderResponseText(responseText);
            });

        } else {
            renderResponseText(httpResponseText);
        }

    };

    function parseResponseURLs(httpResponseText) {
        var responseData = parseResponseText(httpResponseText);
        var referrerURL = responseData.headers['request-url'];
        if(!referrerURL)
            throw new Error("Unknown request-url for response: Header is missing");

        responseData.body.replace(/<a[^>]+href=['"]([^'">]+)['"][^>]*>([^<]+)<\/a>/gi, function(match, url, text, offset, theWholeThing) {
            getRestDB().addURLToDB(url, referrerURL);
        });
    }

    function executeLocalGETRequest(commandString, callback) {
        var requestData = parseRequestBody(commandString);
        parseURLWithDefaultHost(requestData.url, function(urlData) {
            console.log(urlData);
            if(!urlData.host)
                throw new Error("Invalid Host: " + commandString);
            var formattedCommandString = requestData.createRequestString(); // "GET " + urlData.url + "\n" + requestHeaders.join("\n");
            getRestDB().getContent(urlData.path_fixed, onContent);

            function onContent(err, contentData) {
                if(err)
                    throw new Error(err);

                if(contentData) {

                    var signedBody = protectHTMLContent(contentData.content_verified);

                    templateRestResponseBody(
                        signedBody,
                        requestData.url,
                        200,
                        "OK",
                        requestData.createResponseHeaderString(),
                        callback
                    );

                } else {
                    (function() {
                        importScripts('template/template-defaults.js');
                        getDefaultResponse(formattedCommandString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                            responseHeaders = (responseHeaders ? responseHeaders + "\n" : "") + requestData.createResponseHeaderString();
                            defaultResponseBody = protectHTMLContent(defaultResponseBody);

                            templateRestResponseBody(
                                defaultResponseBody,
                                requestData.url,
                                responseCode,
                                responseText,
                                responseHeaders,
                                callback);
                        });
                    })();
                }
            }
        });
    }

    function getPathIterator(urlPrefix, callback, onFinish) {
        var match = urlPrefix.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var scheme = match[2] || 'socket';
        var host = match[4];
        var pathPrefix = (match[5] || '')
            .replace(/^\/~/, '/home/' + host);

        var query = match[7];
        var fragment = match[9];

        RestDB(function(db) {
            urlPrefix = (scheme + "://" + host + pathPrefix).toLowerCase();
            if(urlPrefix[urlPrefix.length-1] !== '/')
                urlPrefix += '/';
            var transaction = db.transaction([RestDB.DB_TABLE_HTTP_URL], "readonly");
            var urlStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_URL);

            var boundKeyRange = IDBKeyRange.bound(urlPrefix, urlPrefix + '\uffff', true, true);
            //console.log(urlPrefix, boundKeyRange);

            urlStore.openCursor(boundKeyRange)
                .onsuccess = function (e) {
                    var cursor = e.target.result;
                    if(!cursor)
                        return (onFinish ? onFinish() : null);

                    var ret = callback(cursor.value);
                    if(ret === false)
                        return (onFinish ? onFinish() : null);
                    cursor.continue();
                };
        });
    }

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
        if(urlData.host) {
            r(urlData);
        } else {
            parseURLWithDefaultHost(requestUrl, r);
        }

        function r(urlData) {
            requestUrl = urlData.url;
            var browserID = response.headers['browser-id'] || httpBrowserID++;

            restHTTPBrowserTemplate(responseText, function(html) {
                parseHTMLBody(html, requestUrl, function(parsedResponseBody) {
                    self.routeResponseToClient("LOG.REPLACE " + PATH_PREFIX_GET + browserID + ' * ' + html);
                });
            });

        }
    }

    function parseHTMLBody(htmlBody, contentURL, callback) {
        var match = contentURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var contentURLHost = match[4];
        var contentURLPath = (match[5] || '')
            .replace(/^\/~/, '/home/' + contentURLHost);
        var parentPath = contentURLPath.replace(/[^\/]+\/$/, '') || '/';

        // TODO: move to template system
        if(htmlBody.indexOf("{$html_ul_index}") !== -1) {
            var paths = [[contentURL, '.']];
            var parentURL = 'socket://' + contentURLHost + parentPath;
            if(contentURL !== parentURL)
                paths.push([parentURL, '..']);
            getPathIterator(contentURL, function(data) {
                var matchedURL = (data.url_original_case || data.url);
                var urlData = parseURL(matchedURL);
                if(urlData.host)
                    urlData.path = urlData.path
                        .replace(/^\/~/, '/home/' + urlData.host);
                paths.push([matchedURL, urlData.path]);

            }, function() {
                var pathHTML = "<ul class='path-index'>";

                for(var i=0; i<paths.length; i++)
                    pathHTML += "\t<li><a href='" + paths[i][0] + "'>" + paths[i][1] + "</a></li>";
                pathHTML += "</ul>";
                htmlBody = htmlBody.replace(/{\$html_ul_index}/gi, pathHTML);
                callback(htmlBody);
            });

        } else {
            callback(htmlBody);
        }
    }

    function protectHTMLContent(htmlContent, formElm) {
        //var tagsToReplace = {
        //    '&': '&amp;',
        //    '<': '&lt;',
        //    '>': '&gt;'
        //};
        //
        //htmlContent = htmlContent.replace(/[&<>]/g, function(tag) {
        //    return tagsToReplace[tag] || tag;
        //});
        //
        //htmlContent = htmlContent.replace(/&lt;(a|p|span|article|header|h1|h2|h3|h4|h5|h6|footer|section)(?:\s+(class|data-path|data-timestamp)=[^=&]+\s*)*&gt;/g, function(tag) {
        //    tag = tag.replace('&lt;', '<');
        //    return tag;
        //});
        //
        //htmlContent = htmlContent.replace(/&lt;\//i, '</');
        //htmlContent = htmlContent.replace(/&gt;/ig, '>');

        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match) {
            var err = "Dangerous HTML: " + match[2];
            if(formElm)
                setStatus(formElm, err);
            throw new Error(err);
        }

        return htmlContent;
    }

    function parseRequestBody(requestText) {
        var headers = requestText.split(/\n/);
        var firstLine = headers.shift();
        var headerValues = {};
        for(var i=0; i<headers.length; i++) {
            var splitHeader = headers[i].split(': ');
            headerValues[splitHeader[0].toLowerCase()] = splitHeader.length > 0 ? splitHeader[1] : true;
        }
        var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/i.exec(firstLine);
        if(!match)
            throw new Error("Invalid GET Request: " + requestText);
        var data = {
            url: match[1],
            http_version: match[2] || 'HTTP/1.1',
            headers: headerValues
        };
        data.createResponseHeaderString = function() {
            var headers = '';
            for (var header in data.headers) {
                if (data.headers.hasOwnProperty(header)) {
                    switch (header.toLowerCase()) {
                        case 'browser-id':
                            headers += "\n" + header + ": " + data.headers[header];
                            break;
                        default:
                            break;
                    }
                }
            }
            return headers;
        };
        data.createRequestHeaderString = function() {
            var headers = '';
            for(var header in data.headers)
                if(data.headers.hasOwnProperty(header))
                    headers += "\n" + header + ": " + data.headers[header];
            return headers;
        };
        data.createRequestString = function() {
            return "GET " + data.url + " " + data.http_version + data.createRequestHeaderString();
        };
        return data;
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

    function parseURLWithDefaultHost(url, callback, onError) {
        var urlData = parseURL(url);
        getPGPDB(function (db) {
            var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
            var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

            var req = privateKeyStore.index('default').get('1');
            req.onsuccess = function (evt) {
                var privateKeyData = evt.target.result;
                if(!privateKeyData) {
                    if(onError)
                        onError("No default PGP Identity Found");
                    throw new Error("No default PGP Identity Found");
                }

                var id_public_short = privateKeyData.id_public.substr(privateKeyData.id_public.length-8);
                if(!urlData.host) {
                    urlData.host = id_public_short;
                    urlData.is_local = true;
                } else {
                    urlData.is_local = urlData.host === id_public_short;
                }
                urlData.path_fixed = urlData.path
                    .replace(/^\/~/, '/home/' + urlData.host);
                urlData.url_fixed = (urlData.scheme || 'socket') + '://' + urlData.host +
                    (urlData.path[0] === '/' ? '' : '/') + urlData.path +
                    (urlData.query ? '?' + urlData.query : '') +
                    (urlData.fragment ? '?' + urlData.fragment : '');

                callback(urlData);
            };
        });
    }

    function getKBPGP() {
        if(typeof self.kbpgp !== 'undefined')
            return self.kbpgp;
        importScripts('pgp/lib/kbpgp/kbpgp.js');
        console.log("Loaded: ", self.kbpgp);
        return self.kbpgp;
    }

    // Database

    function getRestDB(callback) {
        if(typeof RestDB !== 'function')
            importScripts('rest/rest-db.js');

        if(callback)
            RestDB(callback);

        return RestDB;
    }

    function getPGPDB(callback) {
        if(typeof self.PGPDB !== 'function')
            importScripts('pgp/pgp-db.js');

        self.PGPDB(callback);
    }

    function getFeedDB(callback) {
        if(typeof self.FeedDB !== 'function')
            importScripts('feed/feed-db.js');

        self.FeedDB(callback);
    }

})();

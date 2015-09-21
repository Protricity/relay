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
    Commands.add('put', function (commandString) {
        var match = /^put\s*(\S*)\s*([\S\s]+)?$/im.exec(commandString);
        if(!match)
            throw new Error("Invalid PUT: " + commandString);

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
                importScripts('rest/templates/rest-put-template.js');
                Templates.rest.put.preview(content, function(html) {
                    Commands.postResponseToClient("LOG.REPLACE put-preview: " + html);
                });
                // Free up template resources
                delete Templates.rest.put.preview;

            } else {
                Commands.sendWithSocket(commandString);
            }

        } else {
            importScripts('rest/templates/rest-put-template.js');
            Templates.rest.put.form(content, function(html) {
                Commands.postResponseToClient("LOG.REPLACE put: " + html);
            });
            // Free up template resources
            delete Templates.rest.put.form;
        }
    });

    Commands.addResponse('put', Commands.postResponseToClient);


    var httpBrowserID = 1;
    /**
     *
     * @param commandString GET [URL]
     */
    Commands.add('get', function (commandString) {
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
                Commands.sendWithSocket(formattedCommandString);

                importScripts('rest/templates/rest-response-template.js');
                // Show something, sheesh
                Templates.rest.response.body(
                    "<p>Request sent...</p>",
                    requestData.url,
                    200,
                    "Request Sent",
                    requestData.createResponseHeaderString(),
                    function(html) {
                        renderResponseText(html);
                    }
                );
                // Free up template resources
                delete Templates.rest.response.body;

            }
        }, function(err) {
            importScripts('rest/templates/rest-response-template.js');
            Templates.rest.response.body(
                '',
                requestData.url,
                400,
                "Missing Default PGP Identity: " + err,
                requestData.createResponseHeaderString(),
                function(html) {
                    renderResponseText(html);
                }
            );
            // Free up template resources
            delete Templates.rest.response.body;

        });
    });

    Commands.addResponse('get', function(requestResponseString) {

        executeLocalGETRequest(requestResponseString, function(responseText) {
            Commands.sendWithSocket(responseText);
        });
    });

    Commands.addResponse('http', function(httpResponseText) {
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

    });

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
//             console.log(urlData);
            if(!urlData.host)
                throw new Error("Invalid Host: " + commandString);
            var formattedCommandString = requestData.createRequestString(); // "GET " + urlData.url + "\n" + requestHeaders.join("\n");
            getRestDB().getContent(urlData.path_fixed, onContent);

            function onContent(err, contentData) {
                if(err)
                    throw new Error(err);


                if(contentData) {

                    var signedBody = protectHTMLContent(contentData.content_verified);

                    importScripts('rest/templates/rest-response-template.js');
                    Templates.rest.response.body(
                        signedBody,
                        requestData.url,
                        200,
                        "OK",
                        requestData.createResponseHeaderString(),
                        callback
                    );

                    // Free up template resources
                    delete Templates.rest.response.body;

                } else {
                    (function() {
                        getDefaultContentResponse(formattedCommandString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                            responseHeaders = (responseHeaders ? responseHeaders + "\n" : "") + requestData.createResponseHeaderString();
                            defaultResponseBody = protectHTMLContent(defaultResponseBody);

                            importScripts('rest/templates/rest-response-template.js');
                            Templates.rest.response.body(
                                defaultResponseBody,
                                requestData.url,
                                responseCode,
                                responseText,
                                responseHeaders,
                                callback);

                            // Free up template resources
                            delete Templates.rest.response.body;
                        });
                    })();
                }
            }
        });
    }


    //importScripts('template/template-defaults.js');
    // TODO default content public config
    var defaultContentResponses = [
        [/^\/?home\/?$/i, function(commandString, callback) { importScripts('rest/pages/home/user-index.js'); getUserIndexTemplate(commandString, callback); }],
        [/^\/?$/, function(commandString, callback) { importScripts('rest/pages/index.js'); getRootIndexTemplate(commandString, callback); }]
    ];

    var getDefaultContentResponse = function(commandString, callback) {
        var headers = commandString.split(/\n/);
        var firstLine = headers.shift();
        var match = /^get\s*(.*)$/i.exec(firstLine);
        if(!match)
            throw new Error("Invalid GET Request: " + contentURL);
        var contentURL = match[1];

        match = contentURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var contentURLHost = match[4];
        var contentURLPath = (match[5] || '')
            .replace(/^\/~/, '/home/' + contentURLHost)
            .toLowerCase();

        for(var i=0; i<defaultContentResponses.length; i++) {
            //console.log(defaultContentResponses[i], contentURLPath, contentURL);
            if(defaultContentResponses[i][0].test(contentURLPath)) {
                defaultContentResponses[i][1](commandString, callback);
                return;
            }
        }

        importScripts('rest/pages/404.js');
        get404IndexTemplate(commandString, callback);
    };

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

            importScripts('rest/templates/test-browser-template.js');
            Templates.rest.browser(responseText, function(html) {
                parseHTMLBody(html, requestUrl, function(parsedResponseBody) {
                    Commands.postResponseToClient("LOG.REPLACE rest-browser:" + browserID + ' ' + parsedResponseBody);
                });
            });
            // Free up template resources
            delete Templates.rest.browser;

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

    function protectHTMLContent(htmlContent) {
        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match)
            throw new Error("Dangerous HTML: " + match[2]);

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

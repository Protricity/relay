/**
 * Created by ari ooccurred015.
 */
(function() {

    var PATH_PREFIX_PUT = 'put:';
    var PATH_PREFIX_GET = 'get:';

    var ARTICLE_PLACEHOLDER =
        //"<article>\n" +
        "<header>Optional Topic Header</header>\n" +
        "Post about <i>any</i> <strong>topic</strong>\n" +
        "<img src=\"path/to/topic/picture\" alt=\"my picture\" />\n";
    //"</article>";

    var HTTP_BROWSER_TEMPLATE =
        "<script src='rest/rest-listener.js'></script>" +
        "<article class='{$attr_class} http-browser http-response-{$response_code}' data-browser-id='{$browser_id}'>" +
            "<link rel='stylesheet' href='rest/rest.css' type='text/css'>" +
            "<header>" +
                "<span class='command'>GET</span> <span class='url'>{$request_url}</span>" +
            "</header>" +
                "{$html_header_commands}" +
            "<nav>" +
                "<form name='http-browser-navigation-form'>" +
                    "<button type='submit' name='back'>&#8678;</button>" +
                    "<button type='submit' name='forward'>&#8680;</button>" +
                    "<button type='submit' name='home'>&#8962;</button>" +
                    "<input name='url' type='text' value='{$request_url}' />" +
                    "<button type='submit' name='navigate'>&#8476;</button>" +
                "</form>" +
            "</nav>" +
            "<section class='http-body'>" +
                "{$response_body}" +
            "</section>" +
            "<footer class='http-status'>" +
                "{$response_code} {$response_text}" +
            "</footer>" +
        "</article>";

    var RESPONSE_BODY_TEMPLATE =
        "HTTP/1.1 {$response_code} {$response_text}\n" +
        "Content-type: text/html\n" +
        "Content-length: {$response_length}\n" +
        "Request-url: {$request_url}" +
        "{$response_headers}" +
        "\n\n" +
        "{$response_body}";

    var RESPONSE_BODY_404 =
        "<h2>404 Not Found</h2>" +
        "<p>Try these pages instead:</p>" +
        "{$html_ul_index}";

    var RESPONSE_BODY_PENDING =
        "<p>Request sent...</p>";

    var PUT_FORM_TEMPLATE =
        "<article class='{$attr_class}'>" +
            "<script src='rest/rest-listener.js'></script>" +
            "<link rel='stylesheet' href='rest/rest.css' type='text/css'>" +
            "<header><span class='command'>Put</span> content in your web space</header>" +
            "{$html_header_commands}" +

            "<form name='http-put-form' class='compact'>" +
                "<label class='label-content'>Use this text box to create new content for your <strong>web space</strong>:<br/>" +
                    "<textarea cols='56' rows='8' class='focus' name='content' required='required' placeholder='" + ARTICLE_PLACEHOLDER + "'>{$content}</textarea>" +
                "<br/></label>" +

                //"<div class='>" +

                    "<label class='label-pgp-id-private hide-on-compact'>Post with (PGP Identity):<br/>" +
                        "<select name='pgp_id_private' required='required'>" +
                            "<optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>" +
                            "</optgroup>" +
                            "<optgroup disabled='disabled' label='Other options'>" +
                                "<option value=''>Manage PGP Identities...</option>" +
                            "</optgroup>" +
                        "</select>" +
                    "<br/><br/></label>" +

                    "<label class='label-path hide-on-compact'>Post to:<br/>" +
                        "<select name='path'>" +
                            "<option value='~'>My Home Page</option>" +
                            "<option disabled='disabled'>Friend's Web Space...</option>" +
                            "<option disabled='disabled'>Other Web Space...</option>" +
                        "</select>" +
                    "<br/><br/></label>" +

                    //"<label class='label-recipients show-section-on-value'>Choose which subscribers may view this post:<br/>" +
                    //    "<select name='recipients'>" +
                    //        "<option value='*'>Everybody</option>" +
                    //        "<option disabled='disabled'>My friends</option>" +
                    //        "<option disabled='disabled'>Friends of Friends</option>" +
                    //        "<option disabled='disabled'>Specific Recipients</option>" +
                    //    "</select>" +
                    //"<br/><br/></label>" +

                    "<label class='label-passphrase hide-on-compact show-on-passphrase-required'>PGP Passphrase (if required):<br/>" +
                        "<input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>" +
                    "<br/><br/></label>" +

                    "<label class='label-submit hide-on-compact'><hr/>Submit your post:<br/>" +
                        "<input type='submit' value='Post' name='submit-post-form' />" +
                    "</label>" +
                //"</div>" +
            "</form>" +
            "<fieldset class='preview-container' style='display: none'>" +
                "<legend>Preview</legend>" +
                "<div class='preview'></div>" +
            "</fieldset>" +
        "</article>";


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
            //
            //getFeedDB(function (db, FeedDB) {
            //    FeedDB.addVerifiedPostContentToDB(content);
            //});

        } else {
            self.routeResponseToClient("LOG.REPLACE " + PATH_PREFIX_PUT + ' * ' +
                PUT_FORM_TEMPLATE
                    .replace(/{\$row_n}/gi, (putFormCounterN++).toString())
                    .replace(/{\$content}/gi, content || '')
                    .replace(/{\$path}/gi, path)
                //.replace(/{\$[^}]+}/gi, '')
            );

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
            var formattedCommandString = "GET " + parsedUrlData.url + " " + requestData.http_version + requestData.createRequestHeaderString();
            if(parsedUrlData.is_local) {
                // If local, output content to client
                executeLocalGETRequest(formattedCommandString, function(responseText) {
                    renderResponseText(responseText);
                });

            } else {
                // If remote, request content from server
                self.sendWithFastestSocket(formattedCommandString);

                // Show something, sheesh
                var pendingResponseText = RESPONSE_BODY_TEMPLATE
                    .replace(/{\$response_code}/gi, "200")
                    .replace(/{\$response_text}/gi, "Request Sent")
                    .replace(/{\$request_url}/gi, requestData.url)
                    .replace(/{\$response_length}/gi, RESPONSE_BODY_PENDING.length)
                    .replace(/{\$response_body}/gi, RESPONSE_BODY_PENDING)
                    .replace(/{\$response_headers}/gi, requestData.createResponseHeaderString())
                    ;

                renderResponseText(pendingResponseText);
            }
        }, function(err) {
            var errorResponseText = RESPONSE_BODY_TEMPLATE
                .replace(/{\$response_code}/gi, "400")
                .replace(/{\$response_text}/gi, err || "Missing Default PGP Identity")
                .replace(/{\$request_url}/gi, requestData.url)
                .replace(/{\$response_length}/gi, 0)
                .replace(/{\$response_body}/gi, '')
                .replace(/{\$response_headers}/gi, requestData.createResponseHeaderString())
            ;

            renderResponseText(errorResponseText);
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
        var urlData = parseURL(requestData.url);
        if(!urlData.host)
            throw new Error("Invalid Host: " + commandString);
        var formattedCommandString = requestData.createRequestString(); // "GET " + urlData.url + "\n" + requestHeaders.join("\n");
        getRestDB().getContent(urlData.path, onContent);

        function onContent(err, contentData) {
            if(err)
                throw new Error(err);

            if(contentData) {

                var signedBody = protectHTMLContent(contentData.content_verified);
                var responseText200 = RESPONSE_BODY_TEMPLATE
                    .replace(/{\$response_headers}/gi, requestData.createResponseHeaderString())
                    .replace(/{\$response_code}/gi, "200")
                    .replace(/{\$response_text}/gi, "OK")
                    .replace(/{\$request_url}/gi, urlData.url)
                    .replace(/{\$response_length}/gi, signedBody.length)
                    .replace(/{\$response_body}/gi, signedBody);

                callback(responseText200);

            } else {
                (function() {
                    importScripts('template/template-defaults.js');
                    getDefaultResponse(formattedCommandString, function(defaultResponseString, responseCode, responseText, responseHeaders) {
                        responseHeaders = (responseHeaders ? responseHeaders + "\n" : "") + requestData.createResponseHeaderString();

                        defaultResponseString = protectHTMLContent(defaultResponseString);
                        var responseText404 = RESPONSE_BODY_TEMPLATE
                            .replace(/{\$response_headers}/gi, responseHeaders)
                            .replace(/{\$response_code}/gi, responseCode || '200')
                            .replace(/{\$response_text}/gi, responseText || 'OK')
                            .replace(/{\$request_url}/gi, urlData.url)
                            .replace(/{\$response_length}/gi, defaultResponseString.length)
                            .replace(/{\$response_body}/gi, defaultResponseString);

                        callback(responseText404);
                    });
                })();
            }
        }
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
            var browserID = response.headers['browser-id'] || httpBrowserID++;

            parseHTMLBody(response.body, urlData.url, function(parsedResponseBody) {
                self.routeResponseToClient("LOG.REPLACE " + PATH_PREFIX_GET + browserID + ' * ' +
                    HTTP_BROWSER_TEMPLATE
                        .replace(/{\$response_body}/gi, parsedResponseBody)
                        .replace(/{\$response_code}/gi, response.code)
                        .replace(/{\$response_text}/gi, response.text)
                        .replace(/{\$browser_id}/gi, browserID)
                        .replace(/{\$request_url}/gi, urlData.url)
                        //.replace(/{\$response_headers}/gi, '')
                    //.replace(/{\$[^}]+}/gi, '')
                );
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
                urlData.path = urlData.path
                    .replace(/^\/~/, '/home/' + urlData.host);
                urlData.url = (urlData.scheme || 'socket') + '://' + urlData.host +
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

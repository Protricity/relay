/**
 * Created by ari ooccurred015.
 */
(function() {

    var PATH_PREFIX_PUT = 'put:';
    var PATH_PREFIX_GET = 'get:';
    var db = null;


    var ARTICLE_PLACEHOLDER =
        //"<article>\n" +
        "<header>Optional Topic Header</header>\n" +
        "Post about <i>any</i> <strong>topic</strong>\n" +
        "<img src=\"path/to/topic/picture\" alt=\"my picture\" />\n";
    //"</article>";

    var GET_RESPONSE_TEMPLATE =
        "<script src='command/rest/rest-listener.js'></script>" +
        "<article class='{$attr_class} http-response http-response-{$response_code}'>" +
            "<link rel='stylesheet' href='command/rest/rest.css' type='text/css'>" +
            "<header><span class='command'>GET</span> <span class='url'>{$request_url}</span></header>" +
            "{$html_header_commands}" +
            "<nav>" +
                "<button class='navigate-back' disabled='disabled'>&#8678;</button>" +
                "<button class='navigate-forward' disabled='disabled'>&#8680;</button>" +
                "<button class='navigate-home'>&#8962;</button>" +
                "<input name='url' type='text' value='{$request_url}' />" +
                "<button class='navigate-navigate'>&#8476;</button>" +
            "</nav>" +
            "<section class='body'>" +
                "{$response_body}" +
            "</section>" +
        "</article>";

    var RESPONSE_BODY_TEMPLATE =
        "HTTP/1.1 {$response_code} {$response_text}\n" +
        "Content-type: text/html\n" +
        "Content-length: {$response_length}\n" +
        "Request-url: {$request_url}\n" +
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
            "<script src='command/rest/rest-listener.js'></script>" +
            "<link rel='stylesheet' href='command/rest/rest.css' type='text/css'>" +
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
        var match = /^get\s*(.*)$/i.exec(commandString);
        var path = match[1];
        parseUrl(path, function(urlData) {

            if(urlData.is_local) {
                // If local, output content to client
                executeLocalGETRequest(urlData.url, function(responseText) {
                    renderResponseText(responseText, urlData.url);
                });

            } else {
                // If remote, request content from server
                self.sendWithFastestSocket(commandString);

                // Show something, sheesh
                var pendingResponseText = RESPONSE_BODY_TEMPLATE
                    .replace(/{\$response_code}/gi, "200")
                    .replace(/{\$response_text}/gi, "Request Sent")
                    .replace(/{\$request_url}/gi, urlData.url)
                    .replace(/{\$response_length}/gi, RESPONSE_BODY_PENDING.length)
                    .replace(/{\$response_body}/gi, RESPONSE_BODY_PENDING);

                renderResponseText(pendingResponseText, urlData.url);
            }
        });
    };

    socketResponses.get = function(responseString) {
        var match = /^get\s*(.*)$/i.exec(commandString);
        var path = match[1];
        executeLocalGETRequest(path, function(responseText) {
            self.sendWithFastestSocket(responseText);
        });
    };

    socketResponses.http = function(httpResponseBody) {
        renderResponseText(httpResponseBody);
    };

    function executeLocalGETRequest(urlPath, callback) {
        parseUrl(urlPath, function (urlData) {
            getRestDB().getContent(urlData.path, onContent);

            function onContent(err, contentData) {
                if(err)
                    throw new Error(err);

                if(contentData) {
                    var signedBody = protectHTMLContent(contentData.content_verified);
                    var responseText200 = RESPONSE_BODY_TEMPLATE
                        .replace(/{\$response_headers}/gi, "")
                        .replace(/{\$response_code}/gi, "200")
                        .replace(/{\$response_text}/gi, "OK")
                        .replace(/{\$request_url}/gi, urlData.url)
                        .replace(/{\$response_length}/gi, signedBody.length)
                        .replace(/{\$response_body}/gi, signedBody);

                    callback(responseText200);

                } else {
                    var responseText404 = RESPONSE_BODY_TEMPLATE
                        .replace(/{\$response_headers}/gi, "")
                        .replace(/{\$response_code}/gi, "404")
                        .replace(/{\$response_text}/gi, "Not Found")
                        .replace(/{\$request_url}/gi, urlData.url)
                        .replace(/{\$response_length}/gi, RESPONSE_BODY_404.length)
                        .replace(/{\$response_body}/gi, RESPONSE_BODY_404);
console.log(responseText404);
                    callback(responseText404);
                }
            }
        });
    }

    function getPathIterator(urlPrefix, callback, onFinish) {
        var match = urlPrefix.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var scheme = match[2] || 'socket';
        var host = match[4];
        var pathPrefix = match[5] || '';
        var query = match[7];
        var fragment = match[9];

        RestDB(function(db) {
            var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readonly");
            var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

            var pgp_id_public = host;
            var pathIndex = httpContentStore.index(RestDB.DB_INDEX_ID_PATH);
            var boundKeyRange = IDBKeyRange.bound([pgp_id_public, pathPrefix], [pgp_id_public, pathPrefix + 'uffff'], false, false);
            console.log(pathPrefix, urlPrefix, boundKeyRange);

            pathIndex.openKeyCursor(boundKeyRange)
                .onsuccess = function (e) {
                    var cursor = e.target.result;
                    if(!cursor)
                        return (onFinish ? onFinish() : null);
                    var url = 'socket://' + cursor.key[0] + cursor.key[1];
                    var ret = callback(url);
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
        var responseCode = match[1];
        var responseCodeText = match[2];
        return {
            body: responseBody,
            code: match[1],
            text: match[2],
            headers: headerValues
        }
    }

    function renderResponseText(responseText, url) {
        var response = parseResponseText(responseText);
        if(!url)
            url = response.headers['request-url'];
        if(!url)
            throw new Error("No Request-URL Detected");

        var requestUrl = response.headers['request-url'];
        if(!requestUrl)
            throw new Error("Unknown request-url for response: Header is missing");

        parseHTMLBody(response.body, requestUrl, function(parsedResponseBody) {
            self.routeResponseToClient("LOG.REPLACE " + PATH_PREFIX_GET + url + ' * ' +
                GET_RESPONSE_TEMPLATE
                    .replace(/{\$response_body}/gi, parsedResponseBody)
                    .replace(/{\$response_code}/gi, response.code)
                    .replace(/{\$response_text}/gi, response.text)
                    .replace(/{\$request_url}/gi, requestUrl)
                //.replace(/{\$[^}]+}/gi, '')
            );
        });
    }

    function parseHTMLBody(htmlBody, urlPath, callback) {
        if(htmlBody.indexOf("{$html_ul_index}") !== -1) {
            var paths = [];
            getPathIterator(urlPath, function(path) {
                paths.push(path);
                console.log(path);

            }, function() {
                var pathHTML = "<ul class='path-index'>";
                for(var i=0; i<paths.length; i++)
                    pathHTML += "\t<li><a href='" + paths[i] + "'>" + paths[i] + "</a></li>";
                pathHTML += "</ul>";
                htmlBody = htmlBody.replace(/{\$html_ul_index}/gi, pathHTML);
                callback(htmlBody);
            });

        } else {
            callback(htmlBody);
        }
    }

    function protectHTMLContent(htmlContent, formElm) {
        var tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };

        htmlContent = htmlContent.replace(/[&<>]/g, function(tag) {
            return tagsToReplace[tag] || tag;
        });

        htmlContent = htmlContent.replace(/&lt;(a|p|span|article|header|footer|section)(?:\s+(class|data-path|data-timestamp)=[^=&]+\s*)*&gt;/g, function(tag) {
            tag = tag.replace('&lt;', '<');
            return tag;
        });

        htmlContent = htmlContent.replace(/&lt;\//i, '</');
        htmlContent = htmlContent.replace(/&gt;/ig, '>');

        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match) {
            var err = "Dangerous HTML: " + match[2];
            if(formElm)
                setStatus(formElm, err);
            throw new Error(err);
        }

        return htmlContent;
    }

    function parseUrl(url, callback) {
        var pattern = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
        var matches = url.match(pattern);
        var data = {
            url: url,
            scheme: matches[2] || 'socket',
            host: matches[4],
            path: matches[5] || '',
            query: matches[7],
            fragment: matches[9],
            is_local: null
        };
        if(data.path === '~')
            data.path = '~/';
        if(!data.host) {
            data.is_local = true;
            getPGPDB(function (db) {
                var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
                var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

                var index = privateKeyStore.index('default');
                var req = index.get('1');
                req.onsuccess = function (evt) {
                    var privateKeyData = evt.target.result;
                    var id_public_short = privateKeyData.id_public.substr(privateKeyData.id_public.length-8);
                    data.host = id_public_short;
                    data.url = data.scheme + '://' + data.host +
                        (data.path[0] === '/' ? '' : '/') + data.path +
                        (data.query ? '?' + data.query : '') +
                        (data.fragment ? '?' + data.fragment : '');
                    data.path = data.path.replace('~',  "/home/" + id_public_short + "/");
                    callback(data);
                };
            });
        } else {
            data.path = data.path.replace('~',  "/home/" + data.host + "/");
            callback(data);
        }
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

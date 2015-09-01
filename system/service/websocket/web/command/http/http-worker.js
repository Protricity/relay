/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX_PUT = 'put:';
    var db = null;


    var ARTICLE_PLACEHOLDER =
        //"<article>\n" +
        "<header>Optional Topic Header</header>\n" +
        "Post about <i>any</i> <strong>topic</strong>\n" +
        "<img src=\"path/to/topic/picture\" alt=\"my picture\" />\n";
    //"</article>";

    var PUT_FORM_TEMPLATE =
        "<article class='{$attr_class}'>" +
            "<script src='command/http/http-listener.js'></script>" +
            "<link rel='stylesheet' href='command/http/http.css' type='text/css'>" +
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
        var url = parseUrl(path);

        var isLocal = true;

        if(isLocal) {
            // If local, output content to client
            var responseText = getResponseText(commandString, function(responseText) {
                console.log("Serving local content: " + commandString, responseText);
            });

        } else {
            // If remote, request content from server
            self.sendWithFastestSocket(commandString);

        }
    };

    socketResponses.get = function(responseString) {
        var responseText = getResponseText(responseString, function(responseText) {
            console.log(responseString, responseText);
        });
    };

    function getResponseText(commandString, callback) {
        var match = /^get\s*(.*)$/i.exec(commandString);
        var path = match[1];
        var url = parseUrl(path);

        getHttpDB().getContent(path, function(err, contentData) {
            if(err)
                throw new Error(err);
            if(contentData) {
                var responseText200 =
                    "HTTP/1.1 200\n" +
                    "Content-type: text/html\n" +
                    "Content-length: " + contentData.length + "\n" +
                    "\n" +
                    contentData;

                callback(responseText200);

            } else {
                var responseText404 =
                    "HTTP/1.1 404 Not Found\n" +
                    "Content-type: text/html\n";

                callback(responseText404);
            }
        });
    }

    function protectHTMLContent(htmlContent) {
        var tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };

        htmlContent = htmlContent.replace(/[&<>]/g, function(tag) {
            return tagsToReplace[tag] || tag;
        });

        htmlContent = htmlContent.replace(/&lt;(a|p|span|div)(?:\s+(class|data-path|data-timestamp)=[^=&]+\s*)*&gt;/g, function(tag) {
            tag = tag.replace('&lt;', '<');
            return tag;
        });

        htmlContent = htmlContent.replace(/&lt;\//i, '</');
        htmlContent = htmlContent.replace(/&gt;/ig, '>');

        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match)
            throw new Error("Dangerous HTML: " + match[2]);

        return htmlContent;
    }


    function parseUrl(url) {
        var pattern = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
        var matches = url.match(pattern);
        return {
            scheme: matches[2],
            authority: matches[4],
            path: matches[5],
            query: matches[7],
            fragment: matches[9]
        };
    }

    function getKBPGP() {
        if(typeof self.kbpgp !== 'undefined')
            return self.kbpgp;
        importScripts('pgp/lib/kbpgp/kbpgp.js');
        console.log("Loaded: ", self.kbpgp);
        return self.kbpgp;
    }

    // Database

    function getHttpDB(callback) {
        if(typeof self.HttpDB !== 'function')
            importScripts('http/http-db.js');

        if(callback)
            self.HttpDB(callback);

        return self.HttpDB;
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

/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var MS_DAY = 24 * 60 * 60 * 1000;

    var PATH_PREFIX_PUT = 'put:';

    var db = null;



    var ARTICLE_PLACEHOLDER =
        //"<article>\n" +
        "<header>Optional Topic Header</header>\n" +
        "{$html_header_commands}" +
        "Post about <i>any</i> <strong>topic</strong>\n" +
        "<img src=\"path/to/topic/picture\" alt=\"my picture\" />\n";
    //"</article>";

    var FEED_POST_FORM_TEMPLATE =
        "<article class='{$attr_class}'>" +
            "<script src='command/feed/feed-form.js'></script>" +
            "<link rel='stylesheet' href='command/feed/feed.css' type='text/css'>" +
            "<header>Post to your feed</header>" +
            "{$html_header_commands}" +

            "<form name='post-form' class='post-form:uninitiated' action='#' onsubmit='return submitPostForm(event);'>" +
                "<label class='label-content'>Use this text box to create a new feed post:<br/>" +
                    "<textarea cols='56' rows='8' onfocus='focusPostForm(event)' oninput='focusPostForm(event)' class='focus' name='content' required='required' placeholder='" + ARTICLE_PLACEHOLDER + "'>{$content}</textarea>" +
                "<br/></label>" +

                "<div class='show-section-on-value hide-section-on-no-value'>" +

                    "<label class='label-pgp-id'>Post with (PGP Identity):<br/>" +
                        "<select name='pgp-id' required='required' onfocus='focusPostForm(event)' onselect='focusPostForm(event)' oninput='focusPostForm(event)'>" +
                            "<optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>" +
                            "</optgroup>" +
                            "<optgroup disabled='disabled' label='Other options'>" +
                                "<option value=''>Manage PGP Identities...</option>" +
                            "</optgroup>" +
                        "</select>" +
                    "<br/><br/></label>" +

                    "<label class='label-path'>Post to:<br/>" +
                        "<select name='path'>" +
                            "<option value='~'>My Feed</option>" +
                            "<option disabled='disabled'>Other Feed...</option>" +
                            "<option disabled='disabled'>Friend's Feed...</option>" +
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

                    "<label class='label-passphrase' style='display: none'>PGP Passphrase (if required):<br/>" +
                        "<input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>" +
                    "<br/><br/></label>" +

                    "<label class='label-submit'><hr/>Submit your post:<br/>" +
                        "<input type='submit' value='Post' name='submit-post-form' />" +
                    "</label>" +
                "</div>" +
            "</form>" +
            "<fieldset class='preview-container' style='display: none'>" +
                "<legend>Preview</legend>" +
                "<div class='preview'></div>" +
            "</fieldset>" +
        "</article>";


    var postFormNCounter = 0;
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
                FEED_POST_FORM_TEMPLATE
                    .replace(/{\$row_n}/gi, (postFormNCounter++).toString())
                    .replace(/{\$content}/gi, content || '')
                    .replace(/{\$path}/gi, path)
                    //.replace(/{\$[^}]+}/gi, '')
            );

        }


    };

    socketResponses.put = function(commandString) { return self.routeResponseToClient(commandString); };

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

    function getKBPGP() {
        if(typeof self.kbpgp !== 'undefined')
            return self.kbpgp;
        importScripts('pgp/lib/kbpgp/kbpgp.js');
        console.log("Loaded: ", self.kbpgp);
        return self.kbpgp;
    }

    // Database

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

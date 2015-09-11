/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var MS_DAY = 24 * 60 * 60 * 1000;

    var PATH_PREFIX_POST = 'post:';
    var PATH_PREFIX_FEED = 'feed:';

    var db = null;


    var ARTICLE_PLACEHOLDER =
        //"<article>\n" +
        "<header>Optional Topic Header</header>\n" +
        "Post about <i>any</i> <strong>topic</strong>\n" +
        "<img src=\"path/to/topic/picture\" alt=\"my picture\" />\n";
        //"</article>";


    var FEED_POST_FORM_TEMPLATE = "\
        <article class='{$attr_class}'>\n\
            <script src='feed/feed-form.js'></script>\n\
            <link rel='stylesheet' href='feed/feed.css' type='text/css'>\n\
            <header>Post to your feed</header>\n\
            <div class='header-commands'>\n\
                <a class='header-command-minimize' href='#MINIMIZE {$channel_class}'>[-]</a><!--\n\
             --><a class='header-command-maximize' href='#MAXIMIZE {$channel_class}'>[+]</a><!--\n\
             --><a class='header-command-close' href='#CLOSE {$channel_class}'>[x]</a>\n\
            </div>\
            <form name='feed-post-form' class='feed-post-form:uninitiated' action='#' onsubmit='return submitPostForm(event);'>\n\
                <label class='label-content'>Use this text box to create a new feed post:<br/>\n\
                    <textarea cols='56' rows='8' onfocus='focusPostForm(event)' oninput='focusPostForm(event)' class='focus' name='content' required='required' placeholder='" + ARTICLE_PLACEHOLDER + "'>{$content}</textarea>\n\
                <br/></label>\n\
                <div class='show-section-on-value hide-section-on-no-value'>\n\
                    <label class='label-pgp-id'>Post with (PGP Identity):<br/>\n\
                        <select name='pgp-id' required='required' onfocus='focusPostForm(event)' onselect='focusPostForm(event)' oninput='focusPostForm(event)'>\n\
                            <optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>\n\
                            </optgroup>\n\
                            <optgroup disabled='disabled' label='Other options'>\n\
                                <option value=''>Manage PGP Identities...</option>\n\
                            </optgroup>\n\
                        </select>\n\
                    <br/><br/></label>\n\
                    <label class='label-channel'>Post to:<br/>\n\
                        <select name='channel'>\n\
                            <option value='~'>My Feed</option>\n\
                            <option disabled='disabled'>Other Feed...</option>\n\
                            <option disabled='disabled'>Friend's Feed...</option>\n\
                        </select>\n\
                    <br/><br/></label>\n\
                    <label class='label-passphrase' style='display: none'>PGP Passphrase (if required):<br/>\n\
                        <input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>\n\
                    <br/><br/></label>\n\
                    <label class='label-submit'><hr/>Submit your post:<br/>\n\
                        <input type='submit' value='Post' name='submit-feed-post-form' />\n\
                    </label>\n\
                </div>\n\
            </form>\n\
            <fieldset class='preview-container' style='display: none'>\n\
                <legend>Preview</legend>\n\
                <div class='preview'></div>\n\
            </fieldset>\n\
        </article>";

    //"<label class='label-recipients show-section-on-value'>Choose which subscribers may view this post:<br/>\n\
    //    "<select name='recipients'>\n\
    //        "<option value='*'>Everybody</option>\n\
    //        "<option disabled='disabled'>My friends</option>\n\
    //        "<option disabled='disabled'>Friends of Friends</option>\n\
    //        "<option disabled='disabled'>Specific Recipients</option>\n\
    //    "</select>\n\
    //"<br/><br/></label>\n\

    var FEED_TEMPLATE = "\
        <article class='{$attr_class}'>\n\
            <script src='feed/feed-form.js'></script>\n\
            <link rel='stylesheet' href='feed/feed.css' type='text/css'>\n\
            <header>{$title}</header>\n\
            <div class='header-commands'>\n\
                <a class='header-command-minimize' href='#MINIMIZE {$channel_class}'>[-]</a><!--\
             --><a class='header-command-maximize' href='#MAXIMIZE {$channel_class}'>[+]</a><!--\
             --><a class='header-command-close' href='#CLOSE {$channel_class}'>[x]</a>\n\
            </div>\n\
            <div class='feed-container channel-content' onscroll='scrollFeed.apply(this, [event]);'>\n\
                <fieldset class='feed-post-form-container'>\n\
                    FEED_POST_FORM_TEMPLATE\n\
                </fieldset>\n\
            </div>\n\
        </article>";


    var FEED_TEMPLATE_ENTRY = "\
        <fieldset class='feed-post-container unsorted'>\n\
            <header>Feed Post</header>\n\
            <div class='header-commands'>\n\
                <a class='header-command-minimize' href='#MINIMIZE {$channel_class}'>[-]</a><!--\n\
             --><a class='header-command-maximize' href='#MAXIMIZE {$channel_class}'>[+]</a><!--\n\
             --><a class='header-command-close' href='#CLOSE {$channel_class}'>[x]</a>\n\
            </div>\
            <div class='feed-post-author'>\n\
                <img class='user_icon' src='feed/img/user_icon_default.png' alt='UI' />\n\
                <a href='{$user_home}' class='user'>{$user_id}</a>\n\
                <div class='timestamp_formatted'>{$timestamp_formatted}</div>\n\
            </div>\n\
            {$content_verified}\n\
            <div class='feed-post-commands'>\n\
                <button onclick='toggleFeedPostLike([\"{$uid}\")' class='command command-like'>Like</button>\n\
                <button onclick='toggleSection(\"feed-section-comments:{$row_n}\")' class='command command-comment'>Comments</button>\n\
                <button onclick='toggleSection(\"feed-section-share:{$row_n}\")' class='command command-share'>Share</button>\n\
                <button onclick='toggleSection(\"feed-section-info:{$row_n}\")' class='command command-info'>Info</button>\n\
            </div>\n\
            <div class='feed-section-comments:{$row_n}' style='display:none;'>Comments\n\
            </div>\n\
            <div class='feed-section-share:{$row_n}' style='display:none;'>Share\n\
            </div>\n\
            <div class='feed-section-info:{$row_n}' style='display:none;'>Info\n\
            </div>\n\
        </fieldset>";

    var feedNCounter = 0;
    var postFormNCounter = 0;
    /**
     *
     * @param commandString FEED [channel prefix] [start time] [end time]
     */
    socketCommands.feed = function (commandString) {
        var match = /^feed\s*(.*)$/im.exec(commandString);

        var channelPrefix = match[1] || '~';
        var fixedChannelPath = fixChannelPath(channelPrefix);
        var logChannelPath = PATH_PREFIX_FEED + channelPrefix;

        var feedEndTime = Date.now();
        var feedStartTime = feedEndTime - MS_DAY;

        self.routeResponseToClient("LOG.REPLACE " + logChannelPath + ' * ' +
            FEED_TEMPLATE
                .replace(/{\$row_n}/gi, (postFormNCounter++).toString())
                .replace(/{\$title}/gi, "Viewing Feed for " + fixedChannelPath)
                .replace(/{\$channel}/gi, fixedChannelPath)
                //.replace(/{\$[^}]+}/gi, '')
        );

        getPGPDB(function (db, PGPDB) {

            var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
            var dbStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

            dbStore.openCursor().onsuccess = function (evt) {
                var cursor = evt.target.result;
                if (cursor) {
                    var privateKeyData = cursor.value;
                    var keyID = privateKeyData.id_public;
                    var userID = privateKeyData.user_id;
                    var fixedChannelPrefix = fixHomePath(channelPrefix, keyID);


                    getHTTPDB(function(db, FeedDB) {
                        FeedDB.queryFeedPosts(
                            fixedChannelPrefix,
                            [feedStartTime, feedEndTime],
                            function(data) {
                                try{
                                    var contentProtected = protectHTMLContent(data.content_verified);
                                    self.routeResponseToClient("LOG " + logChannelPath + " * " + FEED_TEMPLATE_ENTRY
                                            .replace(/{\$row_n}/gi, (feedNCounter++).toString())
                                            .replace(/{\$uid}/gi, data.key_id + '-' + data.timestamp)
                                            .replace(/{\$user_id}/gi, userID)
                                            .replace(/{\$key_id}/gi, data.key_id)
                                            .replace(/{\$short_key_id}/gi, data.key_id.substr(data.key_id.length - 8))
                                            .replace(/{\$channel}/gi, data.channel)
                                            .replace(/{\$timestamp}/gi, data.timestamp)
                                            .replace(/{\$timestamp_formatted}/gi, timeSince(data.timestamp) + ' ago')
                                            //.replace(/{\$content}/gi, data.content)
                                            .replace(/{\$content_verified}/gi, contentProtected)
                                            //.replace(/{\$[^}]+}/gi, '')
                                    );

                                } catch (e) {
                                    console.error("Skipping Feed Post: " + e);

                                    //discard? config
                                }
                            });
                    });

                } else {
                }
            };
        });

    };



    socketResponses.feed = function(commandString) { return self.sendWithFastestSocket(commandString); };


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

    function timeSince(date) {

        var seconds = Math.floor((new Date() - date) / 1000);

        var interval = Math.floor(seconds / 31536000);

        if (interval > 1) {
            return interval + " years";
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + " months";
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + " days";
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + " hours";
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + " minutes";
        }
        return Math.floor(seconds) + " seconds";
    }

    function fixChannelPath(path) {
        if(!/[#~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }


    function fixHomePath(channelPath, keyID) {
        keyID = keyID.substr(keyID.length - 8);
        channelPath = fixChannelPath(channelPath);
        if(channelPath[0] === '~') {
            channelPath = channelPath.substr(1);
            if(!channelPath || channelPath[0] !== '/')
                channelPath = '/' + channelPath;
            channelPath = '/home/' + keyID + channelPath;
        }
        return channelPath;
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

    function getHTTPDB(callback) {
        if(typeof self.FeedDB !== 'function')
            importScripts('rest/rest-db.js');

        self.FeedDB(callback);
    }

})();

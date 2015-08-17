/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var MS_DAY = 24 * 60 * 60 * 1000;

    var PATH_PREFIX_POST = 'post:';
    var PATH_PREFIX_FEED = 'feed:';

    var db = null;

    var FEED_TEMPLATE =
        "<script src='cmd/feed/feed-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/feed/feed.css' type='text/css'>" +
        "<legend>{$title}</legend>" +
        "<div class='feed-container channel-content'>" +
        "</div>";


    var FEED_TEMPLATE_ENTRY =
        "<fieldset class='feed-post-container'>" +
            "<legend>Feed Post</legend>" +
            "<div class='feed-post-author'>" +
                //"<img src='generic' alt='' />" +
                "<a href='{$user_home}' class='user'>{$user_id}</a>" +
                "<div class='timestamp_posted'>{$timestamp_posted}</div>" +
            "</div>" +
            "{$content_verified}" +
            "<div class='feed-post-commands'>" +
                "<button class='command-like'>Like</button>" +
                "<button class='command-comment'>Comment</button>" +
                "<button class='command-share'>Share</button>" +
            "</div>" +
        "</fieldset>";

    var FEED_POST_FORM_TEMPLATE =
        "<script src='cmd/feed/feed-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/feed/feed.css' type='text/css'>" +
        "<legend>Post to your feed</legend>" +

        "<form name='post-form' action='#' onsubmit='return submitPostForm(event);'>" +
            "<label class='label-content'>Use this text box to create a new feed post:<br/><i>Your post will be appear on your subscribers' feeds</i><br/>" +
                "<textarea cols='56' rows='8' onfocus='focusPostForm(event)' class='focus' name='content' required='required' placeholder='Post anything you like! Some HTML Tags allowed.\nExample:\n\n\t<h1>Optional Topic Header</h1>\n\tPost <i>anything</i> you like!\n\t<img src=\"#mylink\" alt=\"my pic\" />'>{$content}</textarea>" +
            "<br/></label>" +

            "<label class='label-pgp-id'>Post with (PGP Identity):<br/>" +
                "<select name='pgp-id' required='required' onfocus='focusPostForm(event)' onselect='focusPostForm(event)' oninput='focusPostForm(event)'>" +
                    "<optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>" +
                    "</optgroup>" +
                    "<optgroup disabled='disabled' label='Other options'>" +
                        "<option value=''>Manage PGP Identities...</option>" +
                    "</optgroup>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-passphrase' style='display: none'>PGP Passphrase (if required):<br/>" +
            "<input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>" +
            "<br/><br/></label>" +

            "<label class='label-channel'>Post to:<br/>" +
                "<select name='channel'>" +
                    "<option value='~'>My Feed</option>" +
                    "<option disabled='disabled'>Other Feed...</option>" +
                    "<option disabled='disabled'>Friend's Feed...</option>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-recipients'>Choose which subscribers may view this post:<br/>" +
                "<select name='recipients'>" +
                    "<option value='*'>Everybody</option>" +
                    "<option disabled='disabled'>My friends</option>" +
                    "<option disabled='disabled'>Friends of Friends</option>" +
                    "<option disabled='disabled'>Specific Recipients</option>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-post-form'>Submit your post:<br/>" +
                "<input type='submit' value='Post' name='submit-post-form' />" +
            "</label>" +
        "</form>" +
        "<fieldset class='preview-container' style='display: none'>" +
            "<legend>Preview</legend>" +
            "<div class='preview'></div>" +
        "</fieldset>";

    /**
     *
     * @param commandString POST [channel] [content]
     */
    self.postCommand = function (commandString) {
        var match = /^post\s*([\s\S]*)?$/im.exec(commandString);

        var content = match[1];

        if(content) {
            sendWithFastestSocket(commandString);
            //
            //getFeedDB(function (db, FeedDB) {
            //    FeedDB.addVerifiedPostContentToDB(content);
            //});

        } else {
            var channelPath = '~';
            routeResponseToClient("RLOG " + PATH_PREFIX_POST + channelPath + ' ' +
                FEED_POST_FORM_TEMPLATE
                    .replace(/{\$content}/gi, content || '')
                    .replace(/{\$channel}/gi, channelPath)
            );

        }


    };

    self.postResponse = routeResponseToClient;

    /**
     *
     * @param commandString FEED [channel prefix] [start time] [end time]
     */
    self.feedCommand = function (commandString) {
        var match = /^feed\s*(.*)$/im.exec(commandString);

        var channelPrefix = match[1] || '~';
        var fixedChannelPath = fixChannelPath(channelPrefix);
        var logChannelPath = PATH_PREFIX_FEED + channelPrefix;

        var feedEndTime = Date.now();
        var feedStartTime = feedEndTime - MS_DAY;

        routeResponseToClient("RLOG " + logChannelPath + ' ' +
            FEED_TEMPLATE
                .replace(/{\$title}/gi, "Viewing Feed for " + fixedChannelPath)
                .replace(/{\$channel}/gi, fixedChannelPath)
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


                    getFeedDB(function(db, FeedDB) {
                        FeedDB.queryFeedPosts(
                            fixedChannelPrefix,
                            [feedStartTime, feedEndTime],
                            function(data) {
//                                 console.log("FEED POST: ", data);
                                routeResponseToClient("LOG " + logChannelPath + " " + FEED_TEMPLATE_ENTRY
                                        .replace(/{\$user_id}/gi, userID)
                                        .replace(/{\$key_id}/gi, data.key_id)
                                        .replace(/{\$short_key_id}/gi, data.key_id.substr(data.key_id.length - 8))
                                        .replace(/{\$channel}/gi, data.channel)
                                        .replace(/{\$timestamp}/gi, data.timestamp)
                                        .replace(/{\$content}/gi, data.content)
                                        .replace(/{\$content_verified}/gi, data.content_verified)
                                        .replace(/{\$[^}]+}/gi, '')
                                );
                            });
                    });

                } else {
                }
            };
        });

    };



    self.feedResponse = routeResponseToClient;

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

    function getFeedDB(callback) {
        if(typeof self.FeedDB !== 'function')
            importScripts('feed/feed-db.js');

        self.FeedDB(callback);
    }

})();

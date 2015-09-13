/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var MS_DAY = 24 * 60 * 60 * 1000;

    var PATH_PREFIX_POST = 'post:';
    var PATH_PREFIX_FEED = 'feed:';

    var db = null;



    var FEED_TEMPLATE = "\
        <article class='channel feed:{$channel_path}'>\n\
            <script src='feed/feed-form.js'></script>\n\
            <link rel='stylesheet' href='feed/feed.css' type='text/css'>\n\
            <header>{$title}</header>\n\
            <div class='header-commands'>\n\
                <a class='header-command-minimize' href='#MINIMIZE feed:{$channel_path}'>[-]</a><!--\
             --><a class='header-command-maximize' href='#MAXIMIZE feed:{$channel_path}'>[+]</a><!--\
             --><a class='header-command-close' href='#CLOSE feed:{$channel_path}'>[x]</a>\n\
            </div>\n\
            <div class='feed-container feed-content:$channel_path' onscroll='scrollFeed.apply(this, [event]);'>\n\
                <fieldset class='feed-post-form-container'>\n\
                    FEED_POST_FORM_TEMPLATE\n\
                </fieldset>\n\
            </div>\n\
        </article>";


    var FEED_TEMPLATE_ENTRY = "\
        <fieldset class='feed-post-container unsorted'>\n\
            <header>Feed Post</header>\n\
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
                .replace(/{\$channel_path}/gi, fixedChannelPath.toLowerCase())
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
                                    self.routeResponseToClient("LOG " + logChannelPath + " " + FEED_TEMPLATE_ENTRY
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

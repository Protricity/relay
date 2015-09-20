/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var MS_DAY = 24 * 60 * 60 * 1000;

    var PATH_PREFIX_POST = 'post:';
    var PATH_PREFIX_FEED = 'feed:';

    var db = null;


    var feedNCounter = 0;
    var postFormNCounter = 0;
    /**
     *
     * @param commandString FEED [channel prefix] [start time] [end time]
     */
    Commands.add('feed', function (commandString) {
        var match = /^feed\s*(.*)$/im.exec(commandString);

        var channelPrefix = match[1] || '~';
        var fixedChannelPath = fixChannelPath(channelPrefix);
        var logChannelPath = PATH_PREFIX_FEED + channelPrefix;

        var feedEndTime = Date.now();
        var feedStartTime = feedEndTime - MS_DAY;

        CommandResponses.postToClient("LOG.REPLACE " + logChannelPath + ' * ' +
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
                                    CommandResponses.postToClient("LOG " + logChannelPath + " " + FEED_TEMPLATE_ENTRY
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

    });



    CommandResponses.add('feed', Commands.sendWithSocket);


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

        self.PGPDB(callback, self.PGPDB);
    }

    function getHTTPDB(callback) {
        if(typeof self.FeedDB !== 'function')
            importScripts('rest/rest-db.js');

        self.FeedDB(callback);
    }

})();

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
        "<div class='feed-container'>" +
        "</div>";



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
     * @param commandString FEED [channel prefix]
     */
    self.feedCommand = function (commandString) {
        var match = /^feed\s*(.*)$/im.exec(commandString);
        var channelPath = fixChannelPath(match[1] || '~');
        var logChannelPath = PATH_PREFIX_FEED + channelPath;

        var feedEndTime = Date.now();
        var feedStartTime = feedEndTime - MS_DAY;
        var authorKeyIDs = []; todo wtf keys? derive from command? iduno

        routeResponseToClient("RLOG " + logChannelPath + ' ' +
            FEED_TEMPLATE
                .replace(/{\$title}/gi, "Viewing Feed for " + channelPath)
                .replace(/{\$channel}/gi, channelPath)
        );

        getFeedDB(function(db, FeedDB) {
            FeedDB.queryFeedPosts(
                authorKeyIDs,
                [feedStartTime, feedEndTime],
                function(data) {
                    routeResponseToClient("LOG " + logChannelPath + " " + MANAGE_TEMPLATE_ENTRY
                        .replace(/{\$id_private}/gi, data.id_private)
                        .replace(/{\$id_public}/gi, data.id_public)
                        .replace(/{\$id_private_short}/gi, data.id_private.substr(data.id_private.length - 8))
                        .replace(/{\$id_public_short}/gi, data.id_public.substr(data.id_public.length - 8))
                        .replace(/{\$block_private}/gi, data.block_private)
                        .replace(/{\$block_public}/gi, data.block_public)
                        .replace(/{\$user_id}/gi, data.user_id.replace(/</, '&lt;'))
                        .replace(/{\$user_name}/gi, data.user_name || '')
                        .replace(/{\$user_email}/gi, data.user_email || '')
                        .replace(/{\$user_comment}/gi, data.user_comment || '')
                        .replace(/{\$passphrase_required}/gi, data.passphrase_required ? "Yes" : "No")
                        .replace(/{\$[^}]+}/gi, '')
                );
            });
        });
    };

    self.feedResponse = routeResponseToClient;

    function fixChannelPath(path) {
        if(!/[#~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
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

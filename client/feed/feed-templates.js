/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.feed = Templates.feed || {};
Templates.feed.container = function(channelPath, callback) {

    var FEED_TEMPLATE = "\
        <article class='channel feed feed:{$channel_path}'>\n\
            <script src='feed/feed-listeners.js'></script>\n\
            <link rel='stylesheet' href='feed/feed.css' type='text/css'>\n\
            <legend class='title'>\
                <span class='command'>Feed</span>: {$channel_path}\
            </legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE feed:{$channel_path}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE feed:{$channel_path}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE feed:{$channel_path}'>[x]</a>\n\
            </div>\n\
            <div class='feed-container feed-content:{$channel_path}' onscroll='scrollFeed.apply(this, [event]);'>\n\
                <fieldset class='feed-post-form-container'>\n\
                    FEED_POST_FORM_TEMPLATE\n\
                </fieldset>\n\
            </div>\n\
        </article>";


    // Callback
    callback(FEED_TEMPLATE
            .replace(/{\$channel_path}/gi, channelPath)
    );
};

Templates.feed.entry = function(entryData, callback) {
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

    var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(entryData.content_verified);
    if(match)
        throw new Error("Dangerous HTML: " + match[2]);

    Templates.feed.entry.n = (Templates.feed.entry.n || 0) + 1;

    var pgp_id_public_short = entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8);
    var user_home = '/home/' + pgp_id_public_short.toLowerCase() + '/';

    // Callback
    callback(FEED_TEMPLATE_ENTRY
            .replace(/{\$row_n}/gi, Templates.feed.entry.n + '')
            .replace(/{\$uid}/gi, entryData.key_id + '-' + entryData.timestamp)
            .replace(/{\$user_id}/gi, pgp_id_public_short)
            .replace(/{\$user_home}/gi, user_home)
            .replace(/{\$pgp_id_public}/gi, entryData.pgp_id_public)
            .replace(/{\$pgp_id_public_short}/gi, entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8))
            .replace(/{\$path}/gi, entryData.path)
            .replace(/{\$timestamp}/gi, entryData.timestamp)
            .replace(/{\$timestamp_formatted}/gi, timeSince(entryData.timestamp) + ' ago')
            //.replace(/{\$content}/gi, data.content)
            .replace(/{\$content_verified}/gi, entryData.content_verified)
        //.replace(/{\$[^}]+}/gi, '')
    );


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
};

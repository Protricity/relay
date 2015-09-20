/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.feed = Templates.feed || {};
Templates.feed.container = function(channelPath, callback) {

    var FEED_TEMPLATE = "\
        <article class='channel chat chat:{$channel_path}'>\n\
            <script src='feed/feed-listeners.js'></script>\n\
            <link rel='stylesheet' href='feed/feed.css' type='text/css'>\n\
            <header>{$title}</header>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE feed:{$channel_path}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE feed:{$channel_path}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE feed:{$channel_path}'>[x]</a>\n\
            </div>\n\
            <div class='feed-container feed-content:$channel_path' onscroll='scrollFeed.apply(this, [event]);'>\n\
                <fieldset class='feed-post-form-container'>\n\
                    FEED_POST_FORM_TEMPLATE\n\
                </fieldset>\n\
            </div>\n\
        </article>";


    // Callback
    callback(FEED_TEMPLATE
            .replace(/{\$channel_path}/gi, channelPath.toLowerCase())
            .replace(/{\$channel}/gi, channelPath)
    );
};

Templates.feed.entry = function(channelPath, entryData, privateKeyData, callback) {
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

    // Callback
    callback(FEED_TEMPLATE_ENTRY
            .replace(/{\$row_n}/gi, (feedNCounter++).toString())
            .replace(/{\$uid}/gi, entryData.key_id + '-' + entryData.timestamp)
            .replace(/{\$user_id}/gi, privateKeyData.user_id)
            .replace(/{\$key_id}/gi, entryData.key_id)
            .replace(/{\$short_key_id}/gi, entryData.key_id.substr(entryData.key_id.length - 8))
            .replace(/{\$channel}/gi, entryData.channel)
            .replace(/{\$timestamp}/gi, entryData.timestamp)
            .replace(/{\$timestamp_formatted}/gi, timeSince(entryData.timestamp) + ' ago')
            //.replace(/{\$content}/gi, data.content)
            .replace(/{\$content_verified}/gi, contentProtected)
        //.replace(/{\$[^}]+}/gi, '')
    );
};

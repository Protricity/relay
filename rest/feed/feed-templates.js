/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.feed = Templates.feed || {};
Templates.feed.container = function(channelPath, callback) {

    var FEED_TEMPLATE = "\
        <article class='channel feed feed:{$channel_path}'>\n\
            <script src='rest/feed/feed-listeners.js'></script>\n\
            <link rel='stylesheet' href='rest/feed/feed.css' type='text/css'>\n\
            <legend class='title'>\
                <span class='command'>Feed</span>: {$channel_path}\
            </legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE feed:{$channel_path}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE feed:{$channel_path}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE feed:{$channel_path}'>[x]</a>\n\
            </div>\n\
            <div class='feed-entries feed-entries:{$channel_path}' onscroll='scrollFeed.apply(this, [event]);'>\n\
            </div>\n\
        </article>";

    //<fieldset class='feed-form-container'>\n\
    //FEED_POST_FORM_TEMPLATE\n\
    //</fieldset>\n\

    // Callback
    callback(FEED_TEMPLATE
            .replace(/{\$channel_path}/gi, channelPath)
    );
};

// <article data-re='7F9B82233110FF44-1442812607259' optional data-path="/home/3110FF44/"
// GET socket://7F9B82233110FF44/@1442812607259

Templates.feed.entry = function(entryData, callback) {
    var FEED_TEMPLATE_ENTRY = "\
        <article class='channel feed-entry feed-entry:{$uid} feed-unsorted' data-uid='{$uid}'>\n\
            <legend class='title'>Feed Post</legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE feed-entry:{$uid}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE feed-entry:{$uid}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE feed-entry:{$uid}'>[x]</a>\n\
            </div>\n\
            <div class='feed-author'>\n\
                <a href='#KEY {$pgp_id_public}' class='user'>\
                    <img class='user_icon tiny' src='rest/feed/img/user_icon_default.png' alt='UI' />\n\
                    {$author}\n\
                </a>\n\
                <div class='timestamp_formatted'>{$timestamp_formatted}</div>\n\
            </div>\n\
            <div class='feed-content'>{$content_verified}</div>\n\
            <div class='feed-content-source'>{$content_signed}</div>\n\
            <div class='feed-commands'>\n\
                <form name='feed-like-form'><button>Like</button></form>\n\
                <form name='feed-comments-form'><button>Comments</button></form>\n\
                <form name='feed-share-form'><button>Share</button></form>\n\
                <form name='feed-source-form'><button>Source</button></form>\n\
            </div>\n\
            <div class='feed-comments-section feed-comments-section:{$uid}'>\n\
                <img class='user_icon tiny' src='rest/feed/img/user_icon_default.png' alt='UI' />\n\
                <input name='comment' placeholder='Write a comment' size='56' />\n\
            </div>\n\
            <div class='feed-share-section'>Share\n\
            </div>\n\
        </article>";

    //<button onclick='this.parentNode.parentNode.classList.toggle(\"show-info-section\")' class='command command-info'>Info</button>\n\
    //<div class='feed-info-section feed-section'>Info\n\
    //</div>\n\

    var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(entryData.content_verified);
    if(match)
        throw new Error("Dangerous HTML: " + match[2]);

    Templates.feed.entry.n = (Templates.feed.entry.n || 0) + 1;

    var pgp_id_public_short = entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8);
    var user_home = '/home/' + pgp_id_public_short.toLowerCase() + '/';
    var authorMatch = /data-author=["'](\S+)["']/i.exec(entryData.content_verified);
    var author = authorMatch ? authorMatch[1] : pgp_id_public_short;

    // Callback
    callback(FEED_TEMPLATE_ENTRY
            .replace(/{\$row_n}/gi, Templates.feed.entry.n + '')
            .replace(/{\$uid}/gi, entryData.pgp_id_public + '-' + entryData.timestamp)
            .replace(/{\$author}/gi, author)
            .replace(/{\$user_home}/gi, user_home)
            .replace(/{\$pgp_id_public}/gi, entryData.pgp_id_public)
            .replace(/{\$pgp_id_public_short}/gi, entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8))
            .replace(/{\$path}/gi, entryData.path)
            .replace(/{\$timestamp}/gi, entryData.timestamp)
            .replace(/{\$timestamp_formatted}/gi, Templates.feed.timeSince(entryData.timestamp) + ' ago')
            //.replace(/{\$content}/gi, data.content)
            .replace(/{\$content_signed}/gi, Templates.feed.escapeHTML(entryData.content_signed))
            .replace(/{\$content_verified}/gi, entryData.content_verified)
        //.replace(/{\$[^}]+}/gi, '')
    );

};


Templates.feed.comment = function(entryData, callback) {
    var FEED_TEMPLATE_COMMENT_ENTRY = "\
        <article class='feed-comment feed-comment:{$uid} feed-unsorted'>\n\
            <div class='feed-comment-author'>\n\
                <a href='#KEY {$pgp_id_public}' class='user'>\
                    <img class='user_icon tiny' src='rest/feed/img/user_icon_default.png' alt='UI' />\n\
                    {$author}\n\
                </a>\n\
                <div class='timestamp_formatted'>{$timestamp_formatted}</div>\n\
            </div>\n\
            <div class='feed-comment-content'>{$content_verified}</div>\n\
            <div class='feed-comment-content-source'>{$content_signed}</div>\n\
            <div class='feed-comment-commands'>\n\
                <button onclick='this.parentNode.parentNode.classList.toggle(\"like\")' class='command command-like'>Like</button>\n\
                <button onclick='this.parentNode.parentNode.classList.toggle(\"show-source\")' class='command command-source'>Source</button>\n\
            </div>\n\
        </article>";

    var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(entryData.content_verified);
    if(match)
        throw new Error("Dangerous HTML: " + match[2]);

    Templates.feed.entry.n = (Templates.feed.entry.n || 0) + 1;

    var pgp_id_public_short = entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8);
    var user_home = '/home/' + pgp_id_public_short.toLowerCase() + '/';
    var authorMatch = /data-author=["'](\S+)["']/i.exec(entryData.content_verified);
    var author = authorMatch ? authorMatch[1] : pgp_id_public_short;

    // Callback
    callback(FEED_TEMPLATE_COMMENT_ENTRY
            .replace(/{\$row_n}/gi, Templates.feed.entry.n + '')
            .replace(/{\$uid}/gi, entryData.pgp_id_public + '-' + entryData.timestamp)
            .replace(/{\$author}/gi, author)
            .replace(/{\$user_home}/gi, user_home)
            .replace(/{\$pgp_id_public}/gi, entryData.pgp_id_public)
            .replace(/{\$pgp_id_public_short}/gi, entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8))
            .replace(/{\$path}/gi, entryData.path)
            .replace(/{\$timestamp}/gi, entryData.timestamp)
            .replace(/{\$timestamp_formatted}/gi, Templates.feed.timeSince(entryData.timestamp) + ' ago')
            //.replace(/{\$content}/gi, data.content)
            .replace(/{\$content_signed}/gi, Templates.feed.escapeHTML(entryData.content_signed))
            .replace(/{\$content_verified}/gi, entryData.content_verified)
        //.replace(/{\$[^}]+}/gi, '')
    );
};


Templates.feed.escapeHTML = function(html) {
    return html
        .trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

Templates.feed.timeSince = function(date) {
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
};
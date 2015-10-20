/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object')
    (function() {

        //var verifiedContentElms = document.getElementsByClassName('pgp-verified-content1');

        document.addEventListener('render', sortFeedEntry);
        document.addEventListener('submit', onSubmitEvent);

        var unsortedElms = document.getElementsByClassName('feed-unsorted');
        function sortFeedEntry(e) {
            if(unsortedElms.length === 0)
                return;

            var feedEntry = unsortedElms[0];
            feedEntry.classList.remove('feed-unsorted');
            feedEntry.classList.add('feed-sorting');

            sortFeedEntry(e);

            var children = feedEntry.parentNode.children;
            var newTimeStamp = parseInt(feedEntry.querySelector('article[data-timestamp]').getAttribute('data-timestamp'));

            for(var i=0; i<children.length; i++) {
                var child = children[i];
                if(!child.classList.contains('feed-sorted'))
                    continue;
                var existingTimeStamp = parseInt(child.querySelector('article[data-timestamp]').getAttribute('data-timestamp'));

                if(existingTimeStamp < newTimeStamp) {
                    feedEntry.parentNode.insertBefore(feedEntry, child);
                    feedEntry.classList.remove('feed-sorting');
                    feedEntry.classList.add('feed-sorted');
                    return;
                }
            }

            // Insert last
            feedEntry.parentNode.appendChild(feedEntry);
            feedEntry.classList.remove('feed-sorting');
            feedEntry.classList.add('feed-sorted');
        }

        function onSubmitEvent(e, formElm) {
            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
            if(formElm.nodeName.toLowerCase() !== 'form')
                return false;

            switch(formElm.getAttribute('name')) {
                case 'feed-like-form':
                    e.preventDefault();
                    findParentNode(e.target, 'article').classList.toggle('like');
                    return true;

                case 'feed-comments-form':
                    e.preventDefault();
                    findParentNode(e.target, 'article').classList.toggle('show-comments');
                    refreshComments(e);
                    return true;

                case 'feed-share-form':
                    e.preventDefault();
                    return true;

                case 'feed-source-form':
                    e.preventDefault();
                    findParentNode(e.target, 'article').classList.toggle('show-source');
                    return true;

                default:
                    return false;
            }

        }

        function refreshComments(e) {
            var article = findParentNode(e.target, 'article');
            if(!article.classList.contains('show-comments'))
                return false;
            var uid = article.getAttribute('data-uid');

            var commentsSection = article.getElementsByClassName('feed-comments-section')[0];
            console.log("Refresh comments: ", uid, commentsSection);
        }

        function findParentNode(target, parentNodeName) {
            parentNodeName = parentNodeName.toLowerCase();
            while(target = target.parentNode)
                if(target.nodeName.toLowerCase() === parentNodeName)
                    return target;

            throw new Error("Could not find parent: " + parentNodeName);
        }

    })();


// Worker Script
else
    (function() {
        module.exports.renderFeedContainer = function(tagHTML, callback, Client) {
            var TEMPLATE_URL = 'app/social/feed/render/feed-container.html';
            var xhr = new XMLHttpRequest();
            xhr.open("GET", TEMPLATE_URL, false);
            xhr.send();
            if(xhr.status !== 200)
                throw new Error("Error: " + xhr.responseText);
            callback(xhr.responseText
                .replace(/{\$channel_path}/gi, '')
                .replace(/{\$html_put_form}/gi, putFormTemplate)
            );

            return true;

            //<fieldset class='feed-form-container'>\n\
            //FEED_POST_FORM_TEMPLATE\n\
            //</fieldset>\n\

            //var content = '';
            //importScripts('ks/templates/ks-put-template.js');
            //Templates.ks.put.form(content, function(putFormTemplate) {
            //    // Callback
            //
            //    callback(FEED_TEMPLATE
            //            .replace(/{\$channel_path}/gi, '')
            //            .replace(/{\$html_put_form}/gi, putFormTemplate)
            //    );
            //});
            //// Free up template resources
            //delete Templates.ks.put.form;
        };


        module.exports.renderFeedEntry = function(entryData, callback) {
            var FEED_TEMPLATE_ENTRY = "\
        <article class='feed-entry feed-entry:{$uid} feed-unsorted' data-uid='{$uid}'>\n\
            <legend class='title'>Feed Post</legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE feed-entry:{$uid}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE feed-entry:{$uid}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE feed-entry:{$uid}'>[x]</a>\n\
            </div>\n\
            <div class='feed-author'>\n\
                <a href='#KEY {$pgp_id_public}' class='user'>\
                    <img class='user_icon tiny' src='app/social/feed/img/user_icon_default.png' alt='UI' />\n\
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
                <img class='user_icon tiny' src='app/social/feed/img/user_icon_default.png' alt='UI' />\n\
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
                    .replace(/{\$timestamp_formatted}/gi, timeSince(entryData.timestamp) + ' ago')
                    //.replace(/{\$content}/gi, data.content)
                    .replace(/{\$content}/gi, escapeHTML(entryData.content))
                //.replace(/{\$content_verified}/gi, entryData.content_verified)
                //.replace(/{\$[^}]+}/gi, '')
            );

        };


        module.exports.renderFeedComment = function(entryData, callback) {
            var FEED_TEMPLATE_COMMENT_ENTRY = "\
        <article class='feed-comment feed-comment:{$uid} feed-unsorted'>\n\
            <div class='feed-comment-author'>\n\
                <a href='#KEY {$pgp_id_public}' class='user'>\
                    <img class='user_icon tiny' src='app/social/feed/img/user_icon_default.png' alt='UI' />\n\
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
                    .replace(/{\$timestamp_formatted}/gi, timeSince(entryData.timestamp) + ' ago')
                    //.replace(/{\$content}/gi, data.content)
                    .replace(/{\$content}/gi, escapeHTML(entryData.content))
                //.replace(/{\$content_verified}/gi, entryData.content_verified)
                //.replace(/{\$[^}]+}/gi, '')
            );
        };


        function escapeHTML(html) {
            return html
                .trim()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
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


    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
//document.addEventListener('pgp:verified', function(e) {
//    //var htmlContainer = e.target;
//
//    for(var i=verifiedContentElms.length-1; i>=0; i--) {
//        var verifiedContentElm = verifiedContentElms[i];
//
//        var feedPostElm = verifiedContentElm.getElementsByClassName('feed-post')[0];
//        var channel = feedPostElm.getAttribute('data-path');
//        var timestamp = feedPostElm.getAttribute('data-timestamp');
//
//        var chatMessageElm = document.createElement('span');
//        chatMessageElm.innerHTML =
//            '<strong>Feed Post:</strong> <a href="">' +
//            channel +
//            "</a>";
//
//        chatMessageElm.classList.add('feed-link');
//        verifiedContentElm.parentNode.insertBefore(chatMessageElm, verifiedContentElm);
//    }
//});
//

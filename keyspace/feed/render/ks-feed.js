/**
 * Created by ari on 7/2/2015.
 */


// Worker Script
if(typeof module === 'object') (function() {
    module.exports.renderFeedContainer = function(tagHTML, callback, Client) {
        var TEMPLATE_URL = 'keyspace/feed/render/ks-feed.html';
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        var classes = [];

        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        // Query private key
        var path = '/.private/id';
        var html_pgp_id_public_options = "<option value=''>Select a PGP Identity</option>";
        var default_pgp_id_public = null;
        var idCount = 0;
        var status_box = '';
        KeySpaceDB.queryAll(path, function(err, contentEntry) {
            if(err)
                throw new Error(err);

            if(contentEntry) {
                if(!default_pgp_id_public)
                    default_pgp_id_public = contentEntry.pgp_id_public;

                var optionValue = contentEntry.pgp_id_public +
                    ',' + contentEntry.user_id +
                    ',' + (contentEntry.passphrase_required?1:0);

                html_pgp_id_public_options +=
                    "<option value='" + optionValue + "'" +
                        (default_pgp_id_public === contentEntry.pgp_id_public ? ' selected="selected"' : '') +
                    ">" +
                        (contentEntry.passphrase_required?'* ':'&nbsp;  ') +
                        contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8) +
                        ' - ' + contentEntry.user_id +
                    "</option>";

                idCount++;
            } else {

                if(idCount === 0)
                    status_box = "<span class='error'>No PGP Identities were found on this client.</span>" +
                        "<br/>" +
                        "<a onclick='Client.execute(\"PGP.KEYGEN\")'>Generate</a> a new <strong>PGP Identity</strong> in order to post on the <span class='command'>feed</span>";

                var xhr = new XMLHttpRequest();
                xhr.open("GET", TEMPLATE_URL, false);
                xhr.send();
                if(xhr.status !== 200)
                    throw new Error("Error: " + xhr.responseText);
                callback(xhr.responseText
                        .replace(/{\$filter}/gi, '')
                        .replace(/{\$put_content}/gi, '')
                        .replace(/{\$status_box}/gi, status_box)
                        .replace(/{\$classes}/gi, classes.length > 0 ? classes.join(' ') : '')
                        .replace(/{\$html_pgp_id_public_options}/gi, html_pgp_id_public_options)
                );
            }
        });

        return true;
    };
})();

// Client Script
if(typeof document === 'object')
    (function() {
        var REFRESH_TIMEOUT = 20;
        var MS_DAY = 24 * 60 * 60 * 1000;

        // Events

        self.addEventListener('submit', onFormEvent, false);
        self.addEventListener('input', onFormEvent, false);
        self.addEventListener('change', onFormEvent, false);
        self.addEventListener('scroll', refreshFeedContainer, false);
        self.addEventListener('render', function(e) {
            if(!e.target.classList.contains('ks-feed:'))
                return;
            refreshFeedContainer(e, e.target);
        }, false);

        function onFormEvent(e, formElm) {
            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
            if(formElm.nodeName.toLowerCase() !== 'form')
                return false;

            switch(formElm.getAttribute('name')) {
                case 'ks-feed-put-form':
                    refreshHTTPPutForm(e, formElm);
                    if(e.type === 'submit')
                        e.preventDefault() ||
                        submitHTTPPutForm(e, formElm);
                    return true;

                default:
                    return false;
            }
        }



        // Feed handlers

        function refreshFeedContainer(e, feedElm) {
            feedElm = feedElm ||
                (e.target.classList && e.target.classList.contains('ks-feed:') ? e.target : null) ||
                document.getElementsByClassName('ks-feed:')[0];

            var feedEntryContainer = feedElm.getElementsByClassName('ks-feed-entries:')[0];

            if(!feedEntryContainer.onscroll)
                feedEntryContainer.onscroll = refreshFeedContainer;

            var scrollPos = feedEntryContainer.scrollTop;
            var scrollMax = feedEntryContainer.scrollHeight - feedEntryContainer.clientHeight;

//             console.log(scrollPos, scrollMax);

            if(scrollPos >= scrollMax - 20)
                setTimeout(function() {
                    requestMoreFeed(feedEntryContainer);
                }, 200);
        }


        var moreFeedRequested = false;
        function requestMoreFeed(feedEntryContainer) {
            if(moreFeedRequested)
                return console.error("More feed already requested silly!");
            moreFeedRequested = true;
            console.log("Requesting more feed...");

            feedEntryContainer.feedEndTime = feedEntryContainer.feedEndTime || Date.now();

            KeySpaceDB.queryContentFeed(
                feedEntryContainer.feedEndTime,
                function(err, entryData) {
                    //console.info("CONTENT: ", arguments);
                    if(err)
                        throw new Error(err);

                    if(entryData) {
                        addFeedEntry(entryData, feedEntryContainer);

                    } else {
                        moreFeedRequested = false;
                    }
                });

        }


        function addFeedEntry(entryData, containerElm, prepend) {

            var articleDiv = document.createElement('article');
            var articleHTMLContent = null;
            var includeScripts = [];
            if(entryData.content.indexOf('-----BEGIN PGP SIGNED MESSAGE-----') === 0) {

                var pgpClearSignedMessage = openpgp.cleartext.readArmored(entryData.content);
                var htmlContent = protectHTMLContent(pgpClearSignedMessage.text);

                htmlContent = Client.parseScripts(htmlContent, includeScripts);
                htmlContent = Client.parseStyleSheets(htmlContent, includeScripts);
                articleDiv.innerHTML = htmlContent;

                if (articleDiv.children[0].nodeName.toLowerCase() === 'article')
                    articleDiv = articleDiv.children[0];

                articleDiv.classList.add('ks-verified-content');
                articleDiv.setAttribute('data-timestamp', entryData.timestamp);
                articleDiv.setAttribute('data-pgp-id-public', entryData.pgp_id_public);
                articleHTMLContent = articleDiv.outerHTML;

            } else {            // TODO: if PGP KEY BLOCK
                articleDiv.innerHTML = protectHTMLContent(entryData.content)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")
                    .replace(/\n/g, "<br />");

                articleDiv.classList.add('ks-unverified-content');
            }

            var authorAnchorElm = articleDiv.querySelector('a[rel=author]');
            articleHTMLContent = articleDiv.outerHTML;

            if(entryData.timestamp < containerElm.feedEndTime)
                containerElm.feedEndTime = entryData.timestamp-1;

            var templateElm = containerElm.getElementsByClassName('ks-feed-entry-template:')[0];
            var templateHTML = templateElm.outerHTML;

            queryAuthorByKey(entryData.pgp_id_public, function(author) {
                if(!authorAnchorElm) {
                    authorAnchorElm = document.createElement('a');
                    authorAnchorElm.setAttribute('rel', 'author');
                    authorAnchorElm.setAttribute('data-id', entryData.pgp_id_public);
                    authorAnchorElm.innerHTML = author;
                }

                var newFeedContainer = document.createElement('div');
                templateHTML = templateHTML
                    .replace(/{\$entry_pgp_id_public}/gi, entryData.pgp_id_public)
                    .replace(/{\$entry_author_html}/gi, authorAnchorElm.outerHTML)
                    .replace(/{\$entry_path}/gi, entryData.path)
                    .replace(/{\$entry_timestamp}/gi, entryData.timestamp)
                    .replace(/{\$entry_timestamp_formatted}/gi, timeSince(entryData.timestamp))
                    .replace(/{\$entry_content}/gi, articleHTMLContent)
                ;

                newFeedContainer.innerHTML = templateHTML;
                var newFeedEntry = newFeedContainer.children[0];
                newFeedEntry.classList.remove('ks-feed-entry-template:');
                //articleDiv.classList.add('ks-feed-entry');
                var templateElm = containerElm.getElementsByClassName('ks-feed-entry-template:')[0];
                if(prepend && templateElm && templateElm.nextSibling) {
                    containerElm.insertBefore(newFeedEntry, templateElm.nextSibling);

                } else {
                    containerElm.appendChild(newFeedEntry);

                }
                // TODO: appear animation?

                for(var si=0; si<includeScripts.length; si++)
                    ClientMainThread.includeScript(includeScripts[si]);

            });
        }

        var authorCache = {};
        var authorCallbacks = [];
        function queryAuthorByKey(pgp_id_public, callback) {
            pgp_id_public = pgp_id_public.substr(pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH).toUpperCase();
            if(authorCache[pgp_id_public])
                return callback(authorCache[pgp_id_public]);
            authorCallbacks.push([pgp_id_public, callback]);

            if(authorCache[pgp_id_public] === null)
                return null;
            authorCache[pgp_id_public] = null;

            var requestPath = "public/id";
            var requestURL = "http://" + pgp_id_public + ".ks/" + requestPath;

            // console.log("Requesting author for " + pgp_id_public + "...");
            KeySpaceDB.queryOne(requestURL, function (err, contentData) {
                if (err)
                    return callback(err);

                authorCache[pgp_id_public] = pgp_id_public;

                if(contentData)
                    authorCache[pgp_id_public] = contentData.user_id;

                for(var i=0; i<authorCallbacks.length; i++) {
                    var callback = authorCallbacks[i];
                    if(authorCache[callback[0]]) {
                        callback[1](authorCache[callback[0]]);
                        authorCallbacks.splice(i, 1);
                        i--;
                    }
                }
            });
        }

        // Put handlers

        var lastPostContent = null;
        function refreshHTTPPutForm(e, formElm) {
            var pgp_id_public = formElm.pgp_id_public.value.split(',')[0];
            //var user_id = formElm.pgp_id_public.value.split(',')[1];
            var passphrase_required = formElm.pgp_id_public.value.split(',')[2] === '1';
            var passphrase = formElm.passphrase.value;

            var disableSubmit = (passphrase_required || !pgp_id_public) || formElm.content.value.length === 0;
            if(formElm.put.disabled !== disableSubmit)
                formElm.put.disabled = disableSubmit;
            formElm.classList[!passphrase_required ? 'add' : 'remove']('no-passphrase-required');

            formElm.classList[formElm.content.value.length === 0 ? 'add' : 'remove']('compact');
            formElm.parentNode.parentNode.classList[formElm.content.value.length === 0 ? 'add' : 'remove']('compact');

            if(formElm.content.value &&
                (!lastPostContent || lastPostContent != formElm.content.value || e.type === 'change')) {
                lastPostContent = formElm.content.value;

                if(refreshHTTPPutForm.previewTimeout)
                    clearTimeout(refreshHTTPPutForm.previewTimeout);
                refreshHTTPPutForm.previewTimeout = setTimeout(function() {
                    updatePutPreview(e, formElm);
                }, REFRESH_TIMEOUT)
            }

            if(pgp_id_public && passphrase_required) {
                var path = 'http://' + pgp_id_public + '.ks/.private/id';
                KeySpaceDB.queryOne(path, function (err, privateKeyBlock) {
                    if (err)
                        throw new Error(err);
                    if (!privateKeyBlock)
                        throw new Error("Private key not found: " + pgp_id_public);

                    var privateKey = openpgp.key.readArmored(privateKeyBlock.content).keys[0];
                    if (!privateKey.primaryKey.isDecrypted)
                        if (passphrase)
                            privateKey.primaryKey.decrypt(passphrase);

                    if (privateKey.primaryKey.isDecrypted) {
                        if(formElm.put.disabled === true)
                            formElm.put.disabled = false;
                        if(!formElm.classList.contains('passphrase-accepted'))
                            formElm.classList.add('passphrase-accepted');

                    } else {
                        if(formElm.classList.contains('passphrase-accepted'))
                            formElm.classList.remove('passphrase-accepted');
                    }
                });
            }

            // Refresh pgp identities

            var default_pgp_id_public = null;
            queryPGPIdentities(default_pgp_id_public, function(html_pgp_id_public_options, idCount) {
                formElm.getElementsByClassName('status-box')[0].innerHTML =
                    idCount > 0 ? '' :
                    "<span class='error'>No PGP Identities were found on this client.</span>" +
                    "<br/>" +
                    "<a onclick='Client.execute(\"PGP.KEYGEN\">Generate</a> a new <strong>PGP Identity</strong> in order to post on the <span class='command'>feed</span>";

                formElm.pgp_id_public.innerHTML =
                    "<option value=''>Select a PGP Identity</option>"
                    + html_pgp_id_public_options;
            });
        }

        function queryPGPIdentities(default_pgp_id_public, callback) {

            var queryPath = '/.private/id';
            var html_pgp_id_public_options = ''; // "<option value=''>Select a PGP Identity</option>";
            var idCount = 0;
            KeySpaceDB.queryAll(queryPath, function(err, contentEntry) {
                if(err)
                    throw new Error(err);

                if(contentEntry) {
                    if(!default_pgp_id_public)
                        default_pgp_id_public = contentEntry.pgp_id_public;

                    var optionValue = contentEntry.pgp_id_public +
                        ',' + contentEntry.user_id +
                        ',' + (contentEntry.passphrase_required?1:0);

                    html_pgp_id_public_options +=
                        "<option value='" + optionValue + "'" +
                        (default_pgp_id_public === contentEntry.pgp_id_public ? ' selected="selected"' : '') +
                        ">" +
                        (contentEntry.passphrase_required?'* ':'&nbsp;  ') +

                        contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8) +
                        ' - ' +
                        contentEntry.user_id +

                        "</option>";

                    idCount++;

                } else {
                    callback(html_pgp_id_public_options, idCount);
                }
            });
        }

        function submitHTTPPutForm(e, formElm) {
            e.preventDefault();
            var pgp_id_public = formElm.pgp_id_public.value.split(',')[0];
            var user_id = formElm.pgp_id_public.value.split(',')[1];
            var passphrase_required = formElm.pgp_id_public.value.split(',')[2] === '1';
            var passphrase = formElm.passphrase.value;
            var contentPath = formElm.path.value;
            var postContent = formElm.content.value;
            var statusBoxElm = formElm.getElementsByClassName('status-box')[0];

            if(!pgp_id_public)
                throw new Error("No PGP Key selected");
            if(!contentPath)
                throw new Error("No Path provided");

            if(contentPath[0] === '~')
                contentPath = '/home/' + pgp_id_public.substr(pgp_id_public.length-16) + contentPath.substr(1);

            while(contentPath[0] === '/')
                contentPath = contentPath.substr(1);

            // Query private key
            var path = 'http://' + pgp_id_public + '.ks/.private/id';
            KeySpaceDB.queryOne(path, function (err, privateKeyBlock) {
                if (err)
                    throw new Error(err);
                if (!privateKeyBlock)
                    throw new Error("Private key not found: " + selectedPrivateKeyID);

                var privateKey = openpgp.key.readArmored(privateKeyBlock.content).keys[0];
                var publicKey = privateKey.toPublic();

                if (!privateKey.primaryKey.isDecrypted)
                    if (passphrase)
                        privateKey.primaryKey.decrypt(passphrase);

                if (!privateKey.primaryKey.isDecrypted) {
                    var errMSG = passphrase === ''
                        ? 'PGP key pair requires a passphrase'
                        : 'Invalid PGP passphrase';
                    statusBoxElm.innerHTML = "<span class='error'>" + errMSG + "</span>";
                    formElm.passphrase.focus();
                    throw new Error(errMSG);
                }

                var author = privateKey.getUserIds()[0];
                var timestamp = Date.now();

                var contentDiv = document.createElement('div');
                contentDiv.innerHTML = postContent;
                var articleElm = contentDiv.querySelector('article');
                if (!articleElm) {
                    contentDiv.innerHTML = "<article>\n\t" + contentDiv.innerHTML + "\n</article>";
                    articleElm = contentDiv.querySelector('article');
                }
                articleElm.setAttribute('data-author', author);
                articleElm.setAttribute('data-path', contentPath);
                //articleElm.setAttribute('data-timestamp', timestamp.toString());
                postContent = articleElm.outerHTML;
                postContent = protectHTMLContent(postContent, formElm);

                statusBoxElm.innerHTML = "<span class='command'>Encrypt</span>ing content...";

                openpgp.signClearMessage(privateKey, postContent)
                    .then(function (pgpSignedContent) {
                        var pgpClearSignedMessage = openpgp.cleartext.readArmored(pgpSignedContent);

                        //Add PublicKeyEncryptedSessionKey
                        var symAlgo = openpgp.key.getPreferredSymAlgo(privateKey);
                        var encryptionKeyPacket = privateKey.getEncryptionKeyPacket();
                        if (encryptionKeyPacket) {
                            var pkESKeyPacket = new openpgp.packet.PublicKeyEncryptedSessionKey();
                            pkESKeyPacket.publicKeyId = encryptionKeyPacket.getKeyId();
                            pkESKeyPacket.publicKeyAlgorithm = encryptionKeyPacket.algorithm;
                            pkESKeyPacket.sessionKey = publicKey;
                            pkESKeyPacket.sessionKeyAlgorithm = openpgp.enums.read(openpgp.enums.symmetric, symAlgo);
                            pkESKeyPacket.encrypt(encryptionKeyPacket);
                            pgpClearSignedMessage.packets.push(pkESKeyPacket);

                        } else {
                            throw new Error('Could not find valid key packet for encryption in key ' + key.primaryKey.getKeyId().toHex());
                        }

                        //var finalPGPSignedContent = pgpClearSignedMessage.armor();
                        //console.log(pgpSignedContent, finalPGPSignedContent);

                        var commandString = "PUT --publish " + pgp_id_public + "\n" + pgpSignedContent; // finalPGPSignedContent;

                        var socketEvent = new CustomEvent('command', {
                            detail: commandString,
                            cancelable: true,
                            bubbles: true
                        });
                        formElm.dispatchEvent(socketEvent);

                        if (!socketEvent.defaultPrevented)
                            throw new Error("Socket event for new post was not handled");

                        if (!socketEvent.defaultPrevented)
                            throw new Error("Socket event for new post was not handled");


                        statusBoxElm.innerHTML = "Your feed post was created <span class='success'>Successful</span>";

                        // TODO: ugly parent node stack
                        var previewElms = formElm.parentNode.parentNode.getElementsByClassName('ks-put-preview:');
                        for(var i=0; i<previewElms.length; i++)
                            previewElms[i].innerHTML = '';

                        formElm.content.value = '';

                        var feedEntryContainer = formElm.parentNode.parentNode.getElementsByClassName('ks-feed-entries:')[0];
                        addFeedEntry({
                            path: contentPath,
                            pgp_id_public: pgp_id_public,
                            content: pgpSignedContent.trim(),
                            timestamp: Date.now(),
                            published: 1
                        }, feedEntryContainer, true);

                        setTimeout(function() {
                            refreshHTTPPutForm(e, formElm);
                        }, 100);
                    });
            });
        }

        function updatePutPreview(e, formElm) {
            var pgp_id_public = formElm.pgp_id_public.value.split(',')[0];
            var user_id = formElm.pgp_id_public.value.split(',')[1];
            var passphrase_required = formElm.pgp_id_public.value.split(',')[2] === '1';

            var postContentElm = formElm.querySelector('textarea[name=content]');
            var pathElm = formElm.querySelector('*[name=path]');
            if(!pathElm)
                throw new Error("No channel field found");

            var postContent = postContentElm.value.trim();
            //if(!postContent.length)
            //    return false;

            var contentDiv = document.createElement('div');
            contentDiv.innerHTML = postContent;
            var articleElm = contentDiv.querySelector('article');
            if(!articleElm) {
                contentDiv.innerHTML = "<article>" + contentDiv.innerHTML + "</article>";
                articleElm = contentDiv.querySelector('article');
            }
            articleElm.setAttribute('data-path', pathElm.value);
            //articleElm.setAttribute('data-timestamp', timestamp.toString());

            articleElm.classList.add('ks-feed-entry:');
            postContent = articleElm.outerHTML;
            postContent = protectHTMLContent(postContent, formElm);



            var newFeedContainer = document.createElement('div');

            var templateElm = formElm.parentNode.parentNode.getElementsByClassName('ks-feed-entry-template:')[0];
            var templateHTML = templateElm.outerHTML;

            templateHTML = templateHTML
                .replace(/{\$entry_pgp_id_public}/gi, pgp_id_public)
                .replace(/{\$entry_author_html}/gi, user_id || "Nobody ...yet")
                .replace(/{\$entry_path}/gi, pathElm.value)
                .replace(/{\$entry_timestamp}/gi, Date.now())
                .replace(/{\$entry_timestamp_formatted}/gi, "Post Preview... coming soon to a feed near you")
                .replace(/{\$entry_content}/gi, postContent)
            ;

            newFeedContainer.innerHTML = templateHTML;
            var newFeedEntry = newFeedContainer.children[0];
            newFeedEntry.classList.remove('ks-feed-entry-template:');
            //containerElm.appendChild(newFeedEntry);

            // TODO: ugly parent node stack
            var previewElms = formElm.parentNode.getElementsByClassName('ks-put-preview:');
            for(var i=0; i<previewElms.length; i++)
                previewElms[i].innerHTML = newFeedEntry.outerHTML;
        }


        function protectHTMLContent(htmlContent) {
            var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
            if(match)
                throw new Error("Dangerous HTML: " + match[2]);

            return htmlContent;
        }

        //function escapeHTML(html) {
        //    return html
        //        .trim()
        //        .replace(/&/g, "&amp;")
        //        .replace(/</g, "&lt;")
        //        .replace(/>/g, "&gt;")
        //        .replace(/"/g, "&quot;")
        //        .replace(/'/g, "&#039;");
        //}

        function timeSince(date) {
            var seconds = Math.floor((new Date() - date) / 1000);

            var interval = Math.floor(seconds / 31536000);

            if (interval > 1)
                return interval + " years ago";

            interval = Math.floor(seconds / 2592000);
            if (interval > 1)
                return interval + " months ago";

            interval = Math.floor(seconds / 86400);
            if (interval > 1)
                return interval + " days ago";

            interval = Math.floor(seconds / 3600);
            if (interval > 1)
                return interval + " hours ago";

            interval = Math.floor(seconds / 60);
            if (interval > 1)
                return interval + " minutes ago";

            if (seconds === 0)
                return "just now";

            return Math.floor(seconds) + " second" + (seconds !== 1 ? 's' : '') + ' ago';
        }


        // Open PGP Worker
        var workerInterval = setInterval(function() {
            if(typeof window.openpgp._worker_init === 'undefined') {
                var OPENPGP_WORKER_URL = 'pgp/lib/openpgpjs/openpgp.worker.js';
                window.openpgp._worker_init = true;
                window.openpgp.initWorker(OPENPGP_WORKER_URL);
//                 console.info("OpenPGP Worker Loaded: " + OPENPGP_WORKER_URL);
            }
            clearInterval(workerInterval);
        }, 200);

    })();

    //
    //
    //module.exports.renderFeedEntry = function(entryData, callback) {
    //    var FEED_TEMPLATE_ENTRY = "\
    //<article class='feed-entry feed-entry:{$uid} feed-unsorted' data-uid='{$uid}'>\n\
    //    <legend class='title'>Feed Post</legend>\n\
    //    <div class='title-commands'>\n\
    //        <a class='title-command-minimize' href='#MINIMIZE feed-entry:{$uid}'>[-]</a><!--\
    //     --><a class='title-command-maximize' href='#MAXIMIZE feed-entry:{$uid}'>[+]</a><!--\
    //     --><a class='title-command-close' href='#CLOSE feed-entry:{$uid}'>[x]</a>\n\
    //    </div>\n\
    //    <div class='feed-author'>\n\
    //        <a href='#KEY {$pgp_id_public}' class='user'>\
    //            <img class='user_icon tiny' src='keyspace/feed/img/user_icon_default.png' alt='UI' />\n\
    //            {$author}\n\
    //        </a>\n\
    //        <div class='timestamp_formatted'>{$timestamp_formatted}</div>\n\
    //    </div>\n\
    //    <div class='feed-content'>{$content_verified}</div>\n\
    //    <div class='feed-content-source'>{$content_signed}</div>\n\
    //    <div class='feed-commands'>\n\
    //        <form name='feed-like-form'><button>Like</button></form>\n\
    //        <form name='feed-comments-form'><button>Comments</button></form>\n\
    //        <form name='feed-share-form'><button>Share</button></form>\n\
    //        <form name='feed-source-form'><button>Source</button></form>\n\
    //    </div>\n\
    //    <div class='feed-comments-section feed-comments-section:{$uid}'>\n\
    //        <img class='user_icon tiny' src='keyspace/feed/img/user_icon_default.png' alt='UI' />\n\
    //        <input name='comment' placeholder='Write a comment' size='56' />\n\
    //    </div>\n\
    //    <div class='feed-share-section'>Share\n\
    //    </div>\n\
    //</article>";
    //
    //    //<button onclick='this.parentNode.parentNode.classList.toggle(\"show-info-section\")' class='command command-info'>Info</button>\n\
    //    //<div class='feed-info-section feed-section'>Info\n\
    //    //</div>\n\
    //
    //    var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(entryData.content_verified);
    //    if(match)
    //        throw new Error("Dangerous HTML: " + match[2]);
    //
    //    Templates.feed.entry.n = (Templates.feed.entry.n || 0) + 1;
    //
    //    var pgp_id_public_short = entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8);
    //    var user_home = '/home/' + pgp_id_public_short.toLowerCase() + '/';
    //    var authorMatch = /data-author=["'](\S+)["']/i.exec(entryData.content_verified);
    //    var author = authorMatch ? authorMatch[1] : pgp_id_public_short;
    //
    //    // Callback
    //    callback(FEED_TEMPLATE_ENTRY
    //            .replace(/{\$row_n}/gi, Templates.feed.entry.n + '')
    //            .replace(/{\$uid}/gi, entryData.pgp_id_public + '-' + entryData.timestamp)
    //            .replace(/{\$author}/gi, author)
    //            .replace(/{\$user_home}/gi, user_home)
    //            .replace(/{\$pgp_id_public}/gi, entryData.pgp_id_public)
    //            .replace(/{\$pgp_id_public_short}/gi, entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8))
    //            .replace(/{\$path}/gi, entryData.path)
    //            .replace(/{\$timestamp}/gi, entryData.timestamp)
    //            .replace(/{\$timestamp_formatted}/gi, timeSince(entryData.timestamp) + ' ago')
    //            //.replace(/{\$content}/gi, data.content)
    //            .replace(/{\$content}/gi, escapeHTML(entryData.content))
    //        //.replace(/{\$content_verified}/gi, entryData.content_verified)
    //        //.replace(/{\$[^}]+}/gi, '')
    //    );
    //
    //};

    //
    //module.exports.renderFeedComment = function(entryData, callback) {
    //    var FEED_TEMPLATE_COMMENT_ENTRY = "\
    //<article class='feed-comment feed-comment:{$uid} feed-unsorted'>\n\
    //    <div class='feed-comment-author'>\n\
    //        <a href='#KEY {$pgp_id_public}' class='user'>\
    //            <img class='user_icon tiny' src='keyspace/feed/img/user_icon_default.png' alt='UI' />\n\
    //            {$author}\n\
    //        </a>\n\
    //        <div class='timestamp_formatted'>{$timestamp_formatted}</div>\n\
    //    </div>\n\
    //    <div class='feed-comment-content'>{$content_verified}</div>\n\
    //    <div class='feed-comment-content-source'>{$content_signed}</div>\n\
    //    <div class='feed-comment-commands'>\n\
    //        <button onclick='this.parentNode.parentNode.classList.toggle(\"like\")' class='command command-like'>Like</button>\n\
    //        <button onclick='this.parentNode.parentNode.classList.toggle(\"show-source\")' class='command command-source'>Source</button>\n\
    //    </div>\n\
    //</article>";
    //
    //    var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(entryData.content_verified);
    //    if(match)
    //        throw new Error("Dangerous HTML: " + match[2]);
    //
    //    Templates.feed.entry.n = (Templates.feed.entry.n || 0) + 1;
    //
    //    var pgp_id_public_short = entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8);
    //    var user_home = '/home/' + pgp_id_public_short.toLowerCase() + '/';
    //    var authorMatch = /data-author=["'](\S+)["']/i.exec(entryData.content_verified);
    //    var author = authorMatch ? authorMatch[1] : pgp_id_public_short;
    //
    //    // Callback
    //    callback(FEED_TEMPLATE_COMMENT_ENTRY
    //            .replace(/{\$row_n}/gi, Templates.feed.entry.n + '')
    //            .replace(/{\$uid}/gi, entryData.pgp_id_public + '-' + entryData.timestamp)
    //            .replace(/{\$author}/gi, author)
    //            .replace(/{\$user_home}/gi, user_home)
    //            .replace(/{\$pgp_id_public}/gi, entryData.pgp_id_public)
    //            .replace(/{\$pgp_id_public_short}/gi, entryData.pgp_id_public.substr(entryData.pgp_id_public.length - 8))
    //            .replace(/{\$path}/gi, entryData.path)
    //            .replace(/{\$timestamp}/gi, entryData.timestamp)
    //            .replace(/{\$timestamp_formatted}/gi, timeSince(entryData.timestamp) + ' ago')
    //            //.replace(/{\$content}/gi, data.content)
    //            .replace(/{\$content}/gi, escapeHTML(entryData.content))
    //        //.replace(/{\$content_verified}/gi, entryData.content_verified)
    //        //.replace(/{\$[^}]+}/gi, '')
    //    );
    //};


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

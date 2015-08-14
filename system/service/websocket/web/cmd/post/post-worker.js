/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX_POST = 'post:';
    var PATH_PREFIX_FEED = 'feed:';

    var DB_NAME = 'feed';
    var DB_TABLE_POSTS = 'posts';
    var DB_TABLE_PUBLIC_KEY_BLOCKS = 'public-key-blocks';

    var db = null;

    var FEED_TEMPLATE =
        "<script src='cmd/post/post-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/post/post.css' type='text/css'>" +
        "<legend>{$title}</legend>" +
        "<div class='feed-container'>" +
        "<button oninput='loadNextFeedPage(\"{$channel}\", 0{$page})'>Load more feed...</button>";
        "</div>";



    var FEED_POST_FORM_TEMPLATE =
        "<script src='cmd/post/post-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/post/post.css' type='text/css'>" +
        "<legend>Post to your feed</legend>" +

        "<form name='post-form' action='#' onsubmit='return submitPostForm(event);'>" +
            "<label class='label-content'>Use this text box to create a new feed post:<br/><i>Your post will be appear on your subscribers' feeds</i><br/>" +
                "<textarea cols='56' rows='8' onfocus='focusPostForm(event)' class='focus' name='content' required='required' placeholder='Post anything you like'>{$content}</textarea>" +
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

            "<label class='label-passphrase' style='display: none'>PGP Passphrase (if required):<br/>" +
                "<input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>" +
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
            addPostToDB(content);
            sendWithFastestSocket(commandString);

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

        routeResponseToClient("RLOG " + PATH_PREFIX_FEED + channelPath + ' ' +
            FEED_TEMPLATE
                .replace(/{\$title}/gi, "Viewing Feed for " + channelPath)
                .replace(/{\$channel}/gi, channelPath)
        );

    };

    self.feedResponse = routeResponseToClient;

    function fixChannelPath(path) {
        if(!/[#~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

    // Database

    //console.log("IndexedDB: ", indexedDB, IDBKeyRange, IDBTransaction);

    var openRequest = indexedDB.open(DB_NAME);
    openRequest.onerror = function(e) {
        console.log("Database error: " + e.target.errorCode);
    };

    openRequest.onsuccess = function(e) {
        console.log('DB Opened: ', openRequest.result);
        db = openRequest.result;
    };
    //openRequest.onblocked =


    openRequest.onupgradeneeded = function (e) {
        var upgradeDB = e.currentTarget.result;
        console.log('Upgrading DB: ', upgradeDB);

        if(!upgradeDB.objectStoreNames.contains(DB_TABLE_POSTS)) {
            var postStore = upgradeDB.createObjectStore(DB_TABLE_POSTS, { autoIncrement: true });
            postStore.createIndex("author", "author", { unique: false });
            postStore.createIndex("timestamp", "timestamp", { unique: false });
            postStore.createIndex("content", "content", { unique: true });
        }
        if(!upgradeDB.objectStoreNames.contains(DB_TABLE_PUBLIC_KEY_BLOCKS)) {
            var publicKeyStore = upgradeDB.createObjectStore(DB_TABLE_PUBLIC_KEY_BLOCKS, { keyPath: "id" });
            publicKeyStore.createIndex("id", "id", { unique: true });
            publicKeyStore.createIndex("content", "content", { unique: true });
        }

    };

    function addPublicKeyBlock(publicKeyBlock) {

        if(publicKeyBlock.indexOf("-----BEGIN PGP PUBLIC KEY BLOCK-----") === -1)
            throw new Error("PGP PUBLIC KEY BLOCK not found");

        var publicKey = window.openpgp.key.readArmored(publicKeyBlock).keys[0];
        var publicKeyID = publicKey.getKeyIds()[0].toHex();

        var transaction = db.transaction([DB_TABLE_PUBLIC_KEY_BLOCKS], "readwrite");
        var publicKeyStore = transaction.objectStore(DB_TABLE_PUBLIC_KEY_BLOCKS);

        var insertData = {
            'id': publicKeyID,
            'content': publicKeyBlock
        };

        var insertRequest = publicKeyStore.add(insertData);
        insertRequest.onsuccess = function(event) {
            console.log("Added public key block to database: ", insertData);
        };
        insertRequest.onerror = function(event) {
            console.log("Error adding public key block: ", insertData, arguments);
        };
    }

    function loadPublicKeyBlockFromDB(encryptionKeyID, callback) {
        var transaction = db.transaction([DB_TABLE_PUBLIC_KEY_BLOCKS], "readonly");
        var objectStore = transaction.objectStore(DB_TABLE_PUBLIC_KEY_BLOCKS);

        var indexID = objectStore.index('id');
        var cursor = indexID.openCursor(IDBKeyRange.only(encryptionKeyID));
        cursor.onsuccess = function(event) {
            var result = event.target.result;
            if(!result)
                throw new Error("Public key block not found: " + encryptionKeyID);

            var pgpData = result.value;
            callback(pgpData.content);
            console.log("Loaded PGP Public Key Block: ", pgpData);
        };
    }

    function decryptPost(pgpMessageContent, callback) {
        var pgpMessage = openpgp.message.readArmored(pgpMessageContent);

        var encryptionKeyID = pgpMessage.getEncryptionKeyIds()[0];

        loadPublicKeyBlockFromDB(encryptionKeyID, function(publicKeyBlock) {

            var publicKey = window.openpgp.key.readArmored(publicKeyBlock).keys[0];

            openpgp.decryptMessage(publicKey, pgpMessage)
                .then(function(decryptedMessage) {
                    callback(decryptedMessage);

                }, function(error) {
                    throw new Error(error);

                });
        });


    }

    function addPostToDB(pgpMessageContent) {
        var pgpMessage = openpgp.message.readArmored(pgpMessageContent);

        var encryptionIDs = pgpMessage.getEncryptionKeyIds();


        var transaction = db.transaction([DB_TABLE_POSTS], "readwrite");
        var objectStore = transaction.objectStore(DB_TABLE_POSTS);

        var postData = {
            'author': encryptionIDs[0],
            'content': pgpMessageContent
            //'timestamp': Math.floor(Date.now() / 1000)
        };

        var insertRequest = objectStore.add(postData);
        insertRequest.onsuccess = function(event) {
            console.log("Added post to database: ", postData);
        };
        insertRequest.onerror = function(event) {
            console.log("Error adding post: ", postData, arguments);
        };
    }

    // TODO: composite query?
    function querySubscribedPosts(callback, authorKeyIDs, startTime, endTime) {
        var transaction = db.transaction([DB_TABLE_POSTS], "readwrite");
        var objectStore = transaction.objectStore(DB_TABLE_POSTS);

        var indexTimestamp = objectStore.index('timestamp');
        var keyRangeValue = endTime > 0
            ? IDBKeyRange.bound(startTime, endTime)
            : IDBKeyRange.lowerBound(startTime, true);

        var cursor = indexTimestamp.openCursor(keyRangeValue);
        cursor.onsuccess = function(e) {
            var cursor = e.target.result;
            if (cursor)
            {
                var postEntry = cursor.value;
                if(authorKeyIDs === null
                    || authorKeyIDs.indexOf(postEntry.author) >= 0) {
                    callback(postEntry);
                }
                cursor.continue();
            }
        };
        //return cursor;
    }

    function getKBPGP() {
        if(typeof self.kbpgp !== 'undefined')
            return self.kbpgp;
        importScripts('pgp/lib/kbpgp/kbpgp.js');
        console.log("Loaded: ", self.kbpgp);
        return self.kbpgp;

//      importScripts('pgp/lib/openpgpjs/openpgp.js');
    }

    //var range = IDBKeyRange.bound("BA", "BA" + '\uffff');

})();

/**
 * Created by ari on 7/2/2015.
 */
(function() {
    // Database

    var DB_NAME = 'feed';
    var DB_TABLE_FEED_POSTS = 'posts';
    var openRequest = null;
    var onDBCallbacks = [];

    self.FeedDB = function(dbReadyCallback) {
        if(!openRequest) {
            openRequest = indexedDB.open(DB_NAME);

            openRequest.onsuccess = function(e) {
                //console.log('DB Opened: ', openRequest.result);
                for(var i=0; i<onDBCallbacks.length; i++)
                    onDBCallbacks[i](openRequest.result, self.FeedDB);
                onDBCallbacks = [];
            };

            openRequest.onerror = function(e) {
                var err = e.currentTarget.result;
                throw new Error(err);
            };

            openRequest.onupgradeneeded = function (e) {
                var upgradeDB = e.currentTarget.result;

                if(!upgradeDB.objectStoreNames.contains(DB_TABLE_FEED_POSTS)) {
                    console.log('Upgrading Table: ', DB_TABLE_FEED_POSTS);
                    var postStore = upgradeDB.createObjectStore(DB_TABLE_FEED_POSTS, { autoIncrement : true });
                    postStore.createIndex("channel", "channel", { unique: false });
                    postStore.createIndex("timestamp", "timestamp", { unique: false });
                    postStore.createIndex("uid", ["key_id", "timestamp"], { unique: true });
                    postStore.createIndex("index_channel_timestamp", ["channel", "timestamp"], { unique: false });
                }

            };

        }


        if(openRequest.readyState === "done") {
            dbReadyCallback(openRequest.result, self.FeedDB);
            return;
        }
        onDBCallbacks.push(dbReadyCallback);
    };


    // Database Methods

    self.FeedDB.verifySignedPost = function(pgpMessageContent, callback) {

         var openpgp = getOpenPGP();

         var pgpSignedMessage = openpgp.cleartext.readArmored(pgpMessageContent);
         var encIDs = pgpSignedMessage.getSigningKeyIds();
         var feedKeyID = encIDs[0].toHex().toUpperCase();

        self.PGPDB.getPublicKeyData(feedKeyID, function (err, pkData) {

            var publicKey = openpgp.key.readArmored(pkData.block_public);

            openpgp.verifyClearSignedMessage(publicKey.keys, pgpSignedMessage)
            .then(function(verifiedContent) {
                for(var i=0; i<verifiedContent.signatures.length; i++)
                    if(!verifiedContent.signatures[i].valid)
                        throw new Error("Invalid Signature: " + verifiedContent.signatures[i].keyid.toHex().toUpperCase());

                verifiedContent.encrypted = pgpMessageContent;
                verifiedContent.signingKeyId = feedKeyID;
                callback(null, verifiedContent);
            });
        });

    };

    self.FeedDB.addVerifiedPostContentToDB = function(verifiedContent, callback) {
        var verifiedText = verifiedContent.text;
        var pgpSignedPost = verifiedContent.encrypted;
        var feedKeyID = verifiedContent.signingKeyId;
        var channel = /data-channel='([^']+)'/i.exec(verifiedText)[1];
        var timestamp = /data-timestamp='(\d+)'/i.exec(verifiedText)[1];

        self.FeedDB(function(db, FeedDB) {

            var transaction = db.transaction([DB_TABLE_FEED_POSTS], "readwrite");
            var feedPostStore = transaction.objectStore(DB_TABLE_FEED_POSTS);

            var insertData = {
                'key_id': feedKeyID,
                'channel': channel,
                'timestamp': timestamp,
                'content': pgpSignedPost,
                'content_verified': verifiedText || null
            };

            var insertRequest = feedPostStore.add(insertData);
            insertRequest.onsuccess = function(event) {
                console.log("Added feed post to database: " + channel, insertRequest);
                if(callback)
                    callback(null, insertData, insertRequest);
            };
            insertRequest.onerror = function(event) {
                var err = event.currentTarget.error;
                var status_content = "Error adding feed post to database: " + err.message;
                console.error(status_content, event);
                if(callback)
                    callback(err, null);
            };
        });
    };

    self.FeedDB.verifyAndAddPostToDB = function(pgpSignedPost, callback) {
        self.FeedDB.verifySignedPost(pgpSignedPost,
            function(err, verifiedContent) {
                if(err)
                    throw new Error(err);
                self.FeedDB.addVerifiedPostContentToDB(verifiedContent, callback);
            }
        );
    };

    self.FeedDB.queryFeedPosts = function(feedChannelPrefix, timeSpan, callback, onComplete) {
        self.FeedDB(function(db, FeedDB) {
            if(typeof timeSpan !== 'object')
                timeSpan = [Date.now(), timeSpan];

            timeSpan = timeSpan.sort();
            var startTime = timeSpan[0];
            var endTime = timeSpan[1];
            var transaction = db.transaction([DB_TABLE_FEED_POSTS], "readwrite");
            var objectStore = transaction.objectStore(DB_TABLE_FEED_POSTS);

            var indexChannelTimestamp = objectStore.index('index_channel_timestamp');

            var lowerBound = [feedChannelPrefix, startTime];
            var upperBound = [feedChannelPrefix + '\uffff', endTime];
            var request = indexChannelTimestamp
                .openCursor(IDBKeyRange.bound(lowerBound,upperBound), 'next')
                .onsuccess = function(e) {
                    var cursor = e.target.result;
                    if (cursor)
                    {
                        var feedData = cursor.value;
//                         console.log("Found Feed Data: ", feedData, [feedChannelPrefix, startTime, endTime]);
                        callback(feedData);
                        cursor.continue();
                    } else {
                        if(onComplete)
                            onComplete();
                    }
                };

        });

    };

    // Encryption

    function getKBPGP() {
        if(typeof self.kbpgp !== 'undefined')
            return self.kbpgp;
        importScripts('pgp/lib/kbpgp/kbpgp.js');
        console.log("Loaded: ", self.kbpgp);
        return self.kbpgp;
    }


    function getOpenPGP() {
        if(typeof self.openpgp !== 'undefined')
            return self.openpgp;
        importScripts('pgp/lib/support/polycrypt.js');
        importScripts('pgp/lib/openpgpjs/openpgp.js');
        console.log("Loaded: ", self.openpgp);
        return self.openpgp;
    }

    // Database

    function getPGPDB(callback) {
        if(typeof self.PGPDB !== 'function')
            importScripts('pgp/pgp-db.js');

        self.PGPDB(callback);
    }

})();

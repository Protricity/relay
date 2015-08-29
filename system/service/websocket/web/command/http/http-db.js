/**
 * Created by ari on 7/2/2015.
 */
(function() {
    // Database

    var DB_NAME = 'http';
    var openRequest = null;
    var onDBCallbacks = [];

    self.HTTPDB = function(dbReadyCallback) {
        if(!openRequest) {
            openRequest = indexedDB.open(DB_NAME);

            openRequest.onsuccess = function(e) {
                //console.log('DB Opened: ', openRequest.result);
                for(var i=0; i<onDBCallbacks.length; i++)
                    onDBCallbacks[i](openRequest.result, self.HTTPDB);
                onDBCallbacks = [];
            };

            openRequest.onerror = function(e) {
                var err = e.currentTarget.result;
                throw new Error(err);
            };

            openRequest.onupgradeneeded = function (e) {
                var upgradeDB = e.currentTarget.result;

                if(!upgradeDB.objectStoreNames.contains(DB_TABLE_HTTP_CONTENT)) {
                    var postStore = upgradeDB.createObjectStore(DB_TABLE_HTTP_CONTENT, { keyPath: 'uid' });
                    postStore.createIndex("channel", "channel", { unique: false });
                    postStore.createIndex("pgp_id_public", "pgp_id_public", { unique: false });
                    postStore.createIndex("timestamp", "timestamp", { unique: false });

                    console.log('Upgraded Table: ', DB_TABLE_HTTP_CONTENT, postStore);
                }

            };

        }


        if(openRequest.readyState === "done") {
            dbReadyCallback(openRequest.result, self.FeedDB);
            return;
        }
        onDBCallbacks.push(dbReadyCallback);
    };

    var DB_TABLE_HTTP_CONTENT = self.HTTPDB.DB_TABLE_HTTP_CONTENT = 'content';

    // Database Methods

    self.HTTPDB.verifySignedContent = function(pgpMessageContent, callback) {

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

    self.HTTPDB.addVerifiedContentToDB = function(verifiedContent, callback) {
        var verifiedText = verifiedContent.text;
        var pgpSignedContent = verifiedContent.encrypted;
        var pgp_public_id = verifiedContent.signingKeyId;
        var path = /data-path='([^']+)'/i.exec(verifiedText)[1];
        var timestamp = /data-timestamp='(\d+)'/i.exec(verifiedText)[1];
        if(!path)
            throw new Error("Invalid Channel");
        if(!timestamp)
            throw new Error("Invalid Timestamp");

        self.HTTPDB(function(db) {

            var transaction = db.transaction([DB_TABLE_HTTP_CONTENT], "readwrite");
            var httpContentStore = transaction.objectStore(DB_TABLE_HTTP_CONTENT);

            var insertData = {
                'uid': pgp_public_id + '-' + timestamp,
                'pgp_public_id': pgp_public_id,
                'path': path,
                'timestamp': timestamp,
                'content': pgpSignedContent,
                'content_verified': verifiedText
            };

            var insertRequest = httpContentStore.add(insertData);
            insertRequest.onsuccess = function(event) {
                console.log("Added http content to database: " + path, insertRequest);
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

    self.HTTPDB.verifyAndAddContentToDB = function(pgpSignedPost, callback) {
        self.HTTPDB.verifySignedContent(pgpSignedPost,
            function(err, verifiedContent) {
                if(err)
                    throw new Error(err);
                self.HTTPDB.addVerifiedContentToDB(verifiedContent, callback);
            }
        );
    };
//
//    self.HTTPDB.queryFeedPosts = function(feedChannelPrefix, timeSpan, callback, onComplete) {
//        self.HTTPDB(function(db, FeedDB) {
//            if(typeof timeSpan !== 'object')
//                timeSpan = [Date.now(), timeSpan];
//
//            timeSpan = timeSpan.sort();
//            var startTime = timeSpan[0];
//            var endTime = timeSpan[1];
//            var transaction = db.transaction([DB_TABLE_FEED_POSTS], "readwrite");
//            var objectStore = transaction.objectStore(DB_TABLE_FEED_POSTS);
//
//            var indexChannelTimestamp = objectStore.index('index_channel_timestamp');
//
//            var lowerBound = [feedChannelPrefix, startTime];
//            var upperBound = [feedChannelPrefix + '\uffff', endTime];
//            var request = indexChannelTimestamp
//                .openCursor(IDBKeyRange.bound(lowerBound,upperBound), 'next')
//                .onsuccess = function(e) {
//                    var cursor = e.target.result;
//                    if (cursor)
//                    {
//                        var feedData = cursor.value;
////                         console.log("Found Feed Data: ", feedData, [feedChannelPrefix, startTime, endTime]);
//                        callback(feedData);
//                        cursor.continue();
//                    } else {
//                        if(onComplete)
//                            onComplete();
//                    }
//                };
//
//        });
//
//    };

    // Encryption

    function getOpenPGP() {
        if(typeof self.openpgp !== 'undefined')
            return self.openpgp;
        importScripts('pgp/lib/support/polycrypt.js');
        importScripts('pgp/lib/openpgpjs/openpgp.js');
        console.log("Loaded: ", self.openpgp);
        return self.openpgp;
    }

})();

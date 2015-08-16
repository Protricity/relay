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
         var fp = encIDs[0].toHex().toUpperCase();

        self.PGPDB.getPublicKeyData(fp, function (err, pkData) {

            var publicKey = openpgp.key.readArmored(pkData.block_public);
//                 privateKey.decrypt('passphrase');

//                 openpgp._worker_init = false;
            openpgp.verifyClearSignedMessage(publicKey.keys, pgpSignedMessage)
            .then(function(verifiedContent) {
                callback(null, verifiedContent.text, verifiedContent);
            });
        });


        //getPGPDB(function(db, PGPDB) {
        //
        //    PGPDB.getPGPKeyIDs(pgpMessageContent, function(sids, ids) {
        //        console.log("IDS: ", sids);
        //
        //        for(var i=0; i<sids.length; i++) {
        //            var fp = sids[i].toUpperCase();
        //
        //            (function (fp) {
        //                self.PGPDB.getPrivateKey(fp, function (err, privateKey, pkData, alice) {
        //                    if(err)
        //                        throw new Error(err);
        //
        //                    var kbpgp = getKBPGP();
        //                    kbpgp.KeyManager.import_from_armored_pgp({
        //                        armored: pkData.block_public
        //                    }, function(err, alice2) {
        //                        if (err)
        //                            throw new Error(err);
        //
        //                        var publicKey = alice.find_crypt_pgp_key();
        //                        var publicKeyFingerprint = publicKey.get_fingerprint().toString('hex').toUpperCase();
        //
        //
        //
        //
        //
        //                        var ring = new kbpgp.keyring.KeyRing;
        //                        var kms = [alice, alice2];
        //                        for (var i in kms) {
        //                            ring.add_key_manager(kms[i]);
        //                        }
        //                        kbpgp.unbox({keyfetch: ring, armored: pgpMessageContent}, function(err, literals) {
        //                            if (err != null) {
        //                                return console.log("Problem: " + err);
        //                            } else {
        //                                console.log("decrypted message");
        //                                console.log(literals[0].toString());
        //                                var ds = km = null;
        //                                ds = literals[0].get_data_signer();
        //                                if (ds) { km = ds.get_key_manager(); }
        //                                if (km) {
        //                                    console.log("Signed by PGP fingerprint");
        //                                    console.log(km.get_pgp_fingerprint().toString('hex'));
        //                                }
        //                            }
        //                        });
        //
        //
        //
        //
        //                    });
        //                });
        //            })(fp);
        //        }
        //    });
        //
        //    //var kbpgp = getKBPGP();
        //    //kbpgp.unbox({
        //    //    armored: pgpMessageContent,
        //    //    keyfetch: PGPDB.fetchPublicKey
        //    //
        //    //}, function(err, literals) {
        //    //    if(err)
        //    //        throw new Error(err);
        //    //    callback(err, literals[0]);
        //    //
        //    //});
        //});
    };

    self.FeedDB.addPostToDB = function(pgpSignedPost, verifiedText, callback) {

        var channel = /data-channel='([^']+)'/i.exec(verifiedText)[1];
        var timestamp = /data-timestamp='(\d+)'/i.exec(verifiedText)[1];

        self.FeedDB(function(db, FeedDB) {

            var transaction = db.transaction([DB_TABLE_FEED_POSTS], "readwrite");
            var feedPostStore = transaction.objectStore(DB_TABLE_FEED_POSTS);

            var insertData = {
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
            function(err, verifiedText, verifiedContent) {
                if(err)
                    throw new Error(err);
                self.FeedDB.addPostToDB(pgpSignedPost, verifiedText, callback);
            }
        );
    };

    self.FeedDB.querySubscribedPosts = function(callback, authorKeyIDs, startTime, endTime) {
        self.FeedDB(function(db, FeedDB) {

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

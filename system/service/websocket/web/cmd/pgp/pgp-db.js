/**
 * Created by ari on 7/2/2015.
 */
(function() {
    // Database

    var DB_NAME = 'pgp';
    var DB_TABLE_PUBLIC_KEYS = 'public-keys';
    var DB_TABLE_PRIVATE_KEYS = 'private-keys';
    var openRequest = null;
    var onDBCallbacks = [];

    self.PGPDB = function(dbReadyCallback) {
        if(!openRequest) {
            openRequest = indexedDB.open(DB_NAME, 2);

            openRequest.onsuccess = function(e) {
                //console.log('DB Opened: ', openRequest.result);
                for(var i=0; i<onDBCallbacks.length; i++)
                    onDBCallbacks[i](openRequest.result, self.PGPDB);
                onDBCallbacks = [];
            };

            openRequest.onerror = function(e) {
                var err = e.currentTarget.result;
                throw new Error(err);
            };

            openRequest.onupgradeneeded = function (e) {
                var upgradeDB = e.currentTarget.result;

                if(!upgradeDB.objectStoreNames.contains(DB_TABLE_PRIVATE_KEYS)) {
                    console.log('Upgrading Table: ', DB_TABLE_PRIVATE_KEYS);
                    var postStore = upgradeDB.createObjectStore(DB_TABLE_PRIVATE_KEYS, { keyPath: "id_private" });
                    postStore.createIndex("id_public", "id_public", { unique: true });
                }

                if(!upgradeDB.objectStoreNames.contains(DB_TABLE_PUBLIC_KEYS)) {
                    console.log('Upgrading Table: ', DB_TABLE_PUBLIC_KEYS);
                    var publicKeyStore = upgradeDB.createObjectStore(DB_TABLE_PUBLIC_KEYS, { keyPath: "id_public" });
                    publicKeyStore.createIndex("user_id", "user_id", { unique: false });
                }

            };

        }


        if(openRequest.readyState === "done") {
            dbReadyCallback(openRequest.result, self.PGPDB);
            return;
        }
        onDBCallbacks.push(dbReadyCallback);
    };

    self.PGPDB.DB_NAME = DB_NAME;
    self.PGPDB.DB_TABLE_PUBLIC_KEYS = DB_TABLE_PUBLIC_KEYS;
    self.PGPDB.DB_TABLE_PRIVATE_KEYS = DB_TABLE_PRIVATE_KEYS;

    // Database Methods

    self.PGPDB.queryPrivateKeys = function(callback, onComplete) {
        self.PGPDB(function (db) {
            var transaction = db.transaction([DB_TABLE_PRIVATE_KEYS], "readonly");
            var dbStore = transaction.objectStore(DB_TABLE_PRIVATE_KEYS);

            var abort = false;
            dbStore.openCursor().onsuccess = function (evt) {
                if(abort)
                    return false;
                var cursor = evt.target.result;
                if (cursor) {
                    dbStore.get(cursor.key).onsuccess = function (evt) {
                        if(abort)
                            return false;
                        var privateKeyData = evt.target.result;
                        var ret = callback(privateKeyData);
                        if(ret === true)
                            abort = true;
                    };
                    if(!abort)
                        cursor.continue();
                } else {
                    if(onComplete)
                        onComplete();
                }
            };
        });
    };


    self.PGPDB.getPGPKeyIDs = function(pgpMessageContent, callback) {
        var kbpgp = getKBPGP();
        kbpgp.unbox({
            armored: pgpMessageContent,
            keyfetch: {
                fetch: function(ids, ops, cb) {
                    var sids = [];
                    for(var i=0; i<ids.length; i++)
                        sids.push(ids[i].toString('hex').toUpperCase());
                    callback(sids, ids);
                }
            }

        }, function(err, literals) {
            if(err)
                throw new Error(err);

        });
    };


    self.PGPDB.getPrivateKeyData = function(id_private, callback) {
        id_private = id_private.substr(id_private.length - 16);

        self.PGPDB(function (db) {
            var transaction = db.transaction([DB_TABLE_PRIVATE_KEYS], "readonly");
            var dbStore = transaction.objectStore(DB_TABLE_PRIVATE_KEYS);

            var req = dbStore.get(id_private);
            req.onsuccess = function (evt) {
                var privateKeyData = evt.target.result;
                if(!privateKeyData)
                    callback("Private Key Not Found: " + id_private, null);
                else
                    callback(null, privateKeyData);
            };
            req.onerror = function(err) {
                callback(err, null);
            }
        });
    };

    self.PGPDB.getPrivateKey = function(id_private, callback) {
        id_private = id_private.substr(id_private.length - 16);

        self.PGPDB.getPrivateKeyData(id_private, function (err, privateKeyData) {

            var kbpgp = getKBPGP();

            kbpgp.KeyManager.import_from_armored_pgp({
                armored: privateKeyData.block_private
            }, function(err, alice) {

                var privateKey = alice.find_signing_pgp_key();
                var privateKeyFingerprint = privateKey.get_fingerprint().toString('hex').toUpperCase();
                callback(err, privateKey, privateKeyData, alice);
 
            });
        });

    };


    self.PGPDB.getPublicKeyData = function(id_public, callback) {
        id_public = id_public.substr(id_public.length - 16);

        self.PGPDB(function (db) {
            var transaction = db.transaction([DB_TABLE_PUBLIC_KEYS], "readonly");
            var dbStore = transaction.objectStore(DB_TABLE_PUBLIC_KEYS);

            var req = dbStore.get(id_public);
            req.onsuccess = function (evt) {
                var publicKeyData = evt.target.result;
                callback(null, publicKeyData);
            };
            req.onerror = function(err) {
                callback(err, null);
            }
        });
    };

    self.PGPDB.getPublicKey = function(id_public, callback) {
        id_public = id_public.substr(id_public.length - 16);

        self.PGPDB.getPublicKeyData(id_public, function (err, publicKeyData) {
            var kbpgp = getKBPGP();
            kbpgp.KeyManager.import_from_armored_pgp({
                armored: publicKeyData.block_public
            }, function (err, alice) {
                if (err)
                    throw new Error(err);

                var publicKey = alice.find_crypt_pgp_key();
                var publicKeyFingerprint = publicKey.get_fingerprint().toString('hex').toUpperCase();

                callback(err, publicKey, publicKeyData, alice);
            });
        });
    };


    self.PGPDB.fetchPublicKey = function(ids, ops, cb) {
        for(var i=0; i<ids.length; i++) {
            var fp = ids[i].toString('hex').toUpperCase();

            (function(fp) {
                self.PGPDB.getPrivateKey(fp, function (err, privateKey, pkData, alice) {
                    var targetFP = fp;
                    if(privateKey) {
                        // Switch to public key
                        targetFP = pkData.id_public;
                        cb(null, alice, 0);
                        return;
                    }

                    self.PGPDB.getPublicKey(targetFP, function (err, publicKey, pkData, alice) {
                        if(!publicKey)
                            throw new Error("No public or private keys found for: " + targetFP);

                        alice.primary.key.priv = alice.primary.key.pub;
                        cb(null, alice, 0);
                    });
                });
            })(fp);
        }
    };
    self.PGPDB.fetchPublicKey.fetch = self.PGPDB.fetchPublicKey;


    self.PGPDB.addPrivateKeyBlock = function(privateKeyBlock, callback) {
        if(privateKeyBlock.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1)
            throw new Error("PGP PRIVATE KEY BLOCK not found");

        var kbpgp = getKBPGP();

        var alice_passphrase = 'uw';

        kbpgp.KeyManager.import_from_armored_pgp({
            armored: privateKeyBlock
        }, function(err, alice) {
            if(err)
                throw new Error(err);


            var privateKey = alice.find_crypt_pgp_key();
            var privateKeyFingerprint = privateKey.get_fingerprint().toString('hex').toUpperCase();

            var publicKey = alice.find_signing_pgp_key();
            var publicKeyFingerprint = publicKey.get_fingerprint().toString('hex').toUpperCase();

            var userID = alice.userids[0];
            var userIDString = "" + userID.get_username()
                + (userID.get_comment() ? ' ' + userID.get_comment() : '')
                + (userID.get_email() ? " <" + userID.get_email() + ">" : '');


            alice.armored_pgp_private = null;
            alice.sign({}, function(err) {
                alice.armored_pgp_public = null;
                alice.export_pgp_public({}, function(err, publicKeyBlock) {
                    console.log("public key: ", publicKeyBlock);

                    self.PGPDB(function(db, PGPDB) {

                        var transaction = db.transaction([DB_TABLE_PRIVATE_KEYS], "readwrite");
                        var privateKeyStore = transaction.objectStore(DB_TABLE_PRIVATE_KEYS);

                        var insertData = {
                            //'fp_private': privateKeyFingerprint,
                            'id_private': privateKeyFingerprint.substr(privateKeyFingerprint.length - 16),
                            //'fp_public': publicKeyFingerprint,
                            'id_public': publicKeyFingerprint.substr(publicKeyFingerprint.length - 16),
                            'user_id': userIDString,
                            //'user_profile_signed': signedUserProfile,
                            'block_private': privateKeyBlock,
                            'block_public': publicKeyBlock,
                            'passphrase_required': alice.is_pgp_locked() ? 1 : 0
                        };
                        if(userID.get_username())
                            insertData['user_name'] = userID.get_username();
                        if(userID.get_email())
                            insertData['user_email'] = userID.get_email();
                        if(userID.get_comment())
                            insertData['user_comment'] = userID.get_comment();

                        var insertRequest = privateKeyStore.add(insertData);
                        insertRequest.onsuccess = function(event) {
                            console.log("Added private key block to database: " + privateKeyFingerprint, insertData);
                            self.PGPDB.addPublicKeyBlock(publicKeyBlock, function() {
                                callback(null, insertData);

                            });
                        };
                        insertRequest.onerror = function(event) {
                            var err = event.currentTarget.error;
                            var status_content = "Error adding private key to database: " + err.message;
                            console.error(status_content, event);
                            callback(status_content, insertData);
                        };


                    });
                });
            });
            //if (alice.is_pgp_locked()) {
            //    alice.unlock_pgp({
            //        passphrase: alice_passphrase
            //    }, function(err) {
            //        if(err)
            //            throw new Error(err);
            //        console.log("Loaded private key with passphrase");
            //    });
            //
            //} else {
            //
            //    console.log("Loaded private key w/o passphrase");
            //}
        });

    };

    self.PGPDB.addPublicKeyBlock = function(publicKeyBlock, callback) {

        if(publicKeyBlock.indexOf("-----BEGIN PGP PUBLIC KEY BLOCK-----") === -1)
            throw new Error("PGP PUBLIC KEY BLOCK not found");

        self.PGPDB(function (db, PGPDB) {

            var kbpgp = getKBPGP();
            kbpgp.KeyManager.import_from_armored_pgp({
                armored: publicKeyBlock
            }, function(err, alice) {
                if (err) {
                    callback(err, null);
                    throw new Error(err);
                }

//                 var publicKey = alice.find_signing_pgp_key();
                var publicKeyFingerprint = alice.get_pgp_fingerprint_str().toUpperCase(); 
                // publicKey.get_fingerprint().toString('hex').toUpperCase();

                var userID = alice.userids[0];
                var userIDString = "" + userID.get_username()
                    + (userID.get_comment() ? ' ' + userID.get_comment() : '')
                    + (userID.get_email() ? " <" + userID.get_email() + ">" : '');

                var transaction = db.transaction([DB_TABLE_PUBLIC_KEYS], "readwrite");
                var publicKeyStore = transaction.objectStore(DB_TABLE_PUBLIC_KEYS);

                var insertData = {
                    //'fp_public': publicKeyFingerprint,
                    'id_public': publicKeyFingerprint.substr(publicKeyFingerprint.length - 16),
                    'user_id': userIDString,
                    //'user_profile_signed': signedUserProfile,
                    'block_public': publicKeyBlock

                };

                var insertRequest = publicKeyStore.add(insertData);
                insertRequest.onsuccess = function(event) {
                    console.log("Added public key block to database: " + publicKeyFingerprint, insertData);
                    callback(null, insertData);
                };
                insertRequest.onerror = function(event) {
                    var err = event.currentTarget.error;
                    var status_content = "Error adding public key to database: " + err.message;
                    console.error(status_content, insertData, arguments);
                };
            });
        });

    };

    function UserProfile(user_profile_content) {
        this.verify = function() {

        };
        this.decryptConfig = function(passphrase, callback) {

        };
    }

    self.PGPDB.getUserProfile = function(keyID, callback) {
        //user_profile_signed
    };

    function getKBPGP() {
        if(typeof self.kbpgp !== 'undefined')
            return self.kbpgp;
        importScripts('pgp/lib/kbpgp/kbpgp.js');
        console.log("Loaded: ", self.kbpgp);
        return self.kbpgp;
    }

})();

/**
 * Created by ari on 7/2/2015.
 */

PGPDB.DB_NAME                = 'pgp';
PGPDB.DB_TABLE_PUBLIC_KEYS   = 'public-keys';
PGPDB.DB_TABLE_PRIVATE_KEYS  = 'private-keys';
PGPDB.DB_TABLE_SESSIONS      = 'sessions';

// PGP Database
function PGPDB(dbReadyCallback) {

    if (typeof PGPDB.getDBRequest === 'undefined') {
        // First Time
        var openRequest = indexedDB.open(PGPDB.DB_NAME, 2);
        var onDBCallbacks = [];
        PGPDB.getDBRequest = function() { return openRequest; };
        PGPDB.getCallbacks = function () { return onDBCallbacks; };
        PGPDB.addCallback = function (callback) { onDBCallbacks.push(callback); };

        openRequest.onsuccess = function (e) {
            //console.log('DB Opened: ', openRequest.result);
            for (var i = 0; i < onDBCallbacks.length; i++)
                onDBCallbacks[i](openRequest.result);
            onDBCallbacks = [];
        };

        openRequest.onerror = function (e) {
            var err = e.currentTarget.result;
            throw new Error(err);
        };

        openRequest.onupgradeneeded = function (e) {
                var upgradeDB = e.currentTarget.result;

                if(!upgradeDB.objectStoreNames.contains(PGPDB.DB_TABLE_PRIVATE_KEYS)) {
                    console.log('Upgrading Table: ', PGPDB.DB_TABLE_PRIVATE_KEYS);
                    var postDBStore = upgradeDB.createObjectStore(PGPDB.DB_TABLE_PRIVATE_KEYS, { keyPath: "id_private" });
                    postDBStore.createIndex("id_public", "id_public", { unique: true });
                    postDBStore.createIndex("default", "default", { unique: false });
                }

                if(!upgradeDB.objectStoreNames.contains(PGPDB.DB_TABLE_PUBLIC_KEYS)) {
                    console.log('Upgrading Table: ', PGPDB.DB_TABLE_PUBLIC_KEYS);
                    var publicKeyDBStore = upgradeDB.createObjectStore(PGPDB.DB_TABLE_PUBLIC_KEYS, { keyPath: "id_public" });
                    publicKeyDBStore.createIndex("user_id", "user_id", { unique: false });
                }

                if(!upgradeDB.objectStoreNames.contains(PGPDB.DB_TABLE_SESSIONS)) {
                    console.log('Upgrading Table: ', PGPDB.DB_TABLE_SESSIONS);
                    var sessionDBStore = upgradeDB.createObjectStore(PGPDB.DB_TABLE_SESSIONS, { keyPath: "session_uid" });
                    sessionDBStore.createIndex("pgp_id_public", "pgp_id_public", { unique: false });
                    //sessionDBStore.createIndex("user_id", "user_id", { unique: false });
                }

        };
    }

    var dbRequest = PGPDB.getDBRequest();
    if (dbRequest.readyState === "done") {
        dbReadyCallback(dbRequest.result);
        return;
    }
    PGPDB.addCallback(dbReadyCallback);
}

// Database Methods

PGPDB.queryPrivateKeys = function(callback, onComplete) {
    PGPDB(function (db) {
        var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
        var dbStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

        var abort = false;
        dbStore.openCursor().onsuccess = function (evt) {
            if(abort) {
                if(onComplete)
                    onComplete();
                return false;
            }
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


PGPDB.getPGPKeyIDs = function(pgpMessageContent, callback) {
    var kbpgp = PGPDB.getKBPGP();
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

PGPDB.getDefaultPrivateKeyData = function (callback) {

    PGPDB(function (db) {
        var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
        var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

        var index = privateKeyStore.index('default');
        var req = index.get('1');
        req.onsuccess = function (evt) {
            var privateKeyData = evt.target.result;
            if(!privateKeyData)
                callback("Default Private Key Not Found", null);
            else
                callback(null, privateKeyData);
        };
    });
};

PGPDB.getPrivateKeyObjectStore = function(callback) {
    PGPDB(function (db) {
        var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
        var dbStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);
        callback(dbStore);
    });
};
PGPDB.getPrivateKeyData = function(id_private, callback) {
    id_private = id_private.substr(id_private.length - 16);

    PGPDB(function (db) {
        var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
        var dbStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

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

PGPDB.getPrivateKey = function(id_private, callback) {
    id_private = id_private.substr(id_private.length - 16);

    PGPDB.getPrivateKeyData(id_private, function (err, privateKeyData) {

        var kbpgp = PGPDB.getKBPGP();

        kbpgp.KeyManager.import_from_armored_pgp({
            armored: privateKeyData.block_private
        }, function(err, alice) {

            var privateKey = alice.find_signing_pgp_key();
            var privateKeyFingerprint = privateKey.get_fingerprint().toString('hex').toUpperCase();
            callback(err, privateKey, privateKeyData, alice);

        });
    });

};


PGPDB.getPublicKeyData = function(id_public, callback) {
    id_public = id_public.substr(id_public.length - 16);

    PGPDB(function (db) {
        var transaction = db.transaction([PGPDB.DB_TABLE_PUBLIC_KEYS], "readonly");
        var dbStore = transaction.objectStore(PGPDB.DB_TABLE_PUBLIC_KEYS);

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

PGPDB.getPublicKey = function(id_public, callback) {
    id_public = id_public.substr(id_public.length - 16);

    PGPDB.getPublicKeyData(id_public, function (err, publicKeyData) {
        var kbpgp = PGPDB.getKBPGP();
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



PGPDB.addPrivateKeyBlock = function(privateKeyBlock, callback) {
    if(privateKeyBlock.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1)
        throw new Error("PGP PRIVATE KEY BLOCK not found");

    var kbpgp = PGPDB.getKBPGP();

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

                PGPDB(function(db) {
                    var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
                    var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

                    var index = privateKeyStore.index('default');
                    var req = index.get('1');
                    req.onsuccess = function (evt) {
                        var privateKeyData = evt.target.result;
                        if(privateKeyData) {
                            console.log("Resetting Default PK: ", privateKeyData);
                            privateKeyData.default = '0';
                            privateKeyStore.put(privateKeyData);
                        }
                    };

                    var insertData = {
                        'default': '1',
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
                        PGPDB.addPublicKeyBlock(publicKeyBlock, function() {
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

PGPDB.addPublicKeyBlock = function(publicKeyBlock, callback) {

    if(publicKeyBlock.indexOf("-----BEGIN PGP PUBLIC KEY BLOCK-----") === -1)
        throw new Error("PGP PUBLIC KEY BLOCK not found");

    PGPDB(function (db) {

        var kbpgp = PGPDB.getKBPGP();
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

            var transaction = db.transaction([PGPDB.DB_TABLE_PUBLIC_KEYS], "readwrite");
            var publicKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PUBLIC_KEYS);

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


PGPDB.addIDSIGToDatabase = function(idsigString, callback) {

    var split = idsigString.split(/\s+/g);
    if(split[0].toUpperCase() !== 'IDSIG')
        throw new Error("Invalid IDSIG: " + idsigString);

    var pgp_key_id = split[1];
    var session_uid = split[2];
    var username = split[3];
    var visibility = split[4];


    PGPDB(function (db) {


        var transaction = db.transaction([PGPDB.DB_TABLE_SESSIONS], "readwrite");
        var sessionDBStore = transaction.objectStore(PGPDB.DB_TABLE_SESSIONS);

        var sessionInsertData = {
            'session_uid': session_uid,
            'pgp_id_public': pgp_key_id.substr(pgp_key_id.length - 16),
            'username': username,
            'visibility': visibility,
            'idsig': idsigString
        };

        var insertRequest = sessionDBStore.add(sessionInsertData);
        insertRequest.onsuccess = function(event) {
            console.log("Added session IDSIG to database: " + idsigString);
            callback(null, sessionInsertData);
        };
        insertRequest.onerror = function(event) {
            var err = event.currentTarget.error;
            var status_content = "Error adding IDSIG to database: " + err.message;
            console.error(status_content, sessionInsertData, arguments);
            callback(err, null);
        };


    });
};

//function UserProfile(user_profile_content) {
//    this.verify = function() {
//
//    };
//    this.decryptConfig = function(passphrase, callback) {
//
//    };
//}
//
//PGPDB.getUserProfile = function(keyID, callback) {
//    //user_profile_signed
//};

PGPDB.getKBPGP = function() {
    if(typeof self.kbpgp !== 'undefined')
        return self.kbpgp;
    importScripts('pgp/lib/kbpgp/kbpgp.js');
    console.log("Loaded: ", self.kbpgp);
    return self.kbpgp;
};

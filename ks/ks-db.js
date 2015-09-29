/**
 * Created by ari on 7/2/2015.
 */
"use strict";
if(!exports) var exports = {};
exports.KeySpaceDB = KeySpaceDB;


KeySpaceDB.DB_VERSION               = 1;
KeySpaceDB.DB_NAME                  = 'ks';
KeySpaceDB.DB_TABLE_HTTP_CONTENT    = 'content';
KeySpaceDB.DB_TABLE_HTTP_URL        = 'url';

KeySpaceDB.DB_INDEX_PATH            = 'path';
KeySpaceDB.DB_INDEX_ID_PATH         = 'id_path';
KeySpaceDB.DB_INDEX_TIMESTAMP       = 'timestamp';

// Config Database
function KeySpaceDB(dbReadyCallback) {
    return KeySpaceDB.getDBInstance(dbReadyCallback);
}

(function() {
    if(typeof indexedDB === 'undefined')
        var mongodb     = require('mongodb'),
            MongoClient = mongodb.MongoClient;

    var dbInst = null;
    var onDBCallbacks = [];
    var connecting = false;
    KeySpaceDB.getDBInstance = function(callback) {
        if(dbInst)
            return callback(dbInst);
        if(callback)
            onDBCallbacks.push(callback);
        if(connecting)
            return;
        connecting = true;

        // First Time
        if (typeof indexedDB !== 'undefined') {
            console.info("indexedDB.open(", KeySpaceDB.DB_NAME, KeySpaceDB.DB_VERSION, ")");
            var openRequest = indexedDB.open(KeySpaceDB.DB_NAME, KeySpaceDB.DB_VERSION);

            openRequest.onsuccess = function (e) {
                dbInst = e.target.result;
                for (var i = 0; i < onDBCallbacks.length; i++)
                    onDBCallbacks[i](dbInst);
                onDBCallbacks = [];
            };

            openRequest.onerror = function (e) {
                var err = e.target.result;
                throw new Error(err);
            };

            openRequest.onupgradeneeded = function (e) {
                var upgradeDB = e.target.result;
                var transaction = e.target.transaction;

                if(!upgradeDB.objectStoreNames.contains(KeySpaceDB.DB_TABLE_HTTP_CONTENT)) {
                    var postStore = upgradeDB.createObjectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT, { keyPath: ["pgp_id_public", "timestamp"] });
                    postStore.createIndex(KeySpaceDB.DB_INDEX_PATH, "path", { unique: false });
                    postStore.createIndex(KeySpaceDB.DB_INDEX_ID_PATH, ["pgp_id_public", "path"], { unique: false });
                    postStore.createIndex(KeySpaceDB.DB_INDEX_TIMESTAMP, ["timestamp"], { unique: false });

                    console.log('Upgraded Table: ' + KeySpaceDB.DB_NAME + '.' + postStore.name);
                }

                if(!upgradeDB.objectStoreNames.contains(KeySpaceDB.DB_TABLE_HTTP_URL)) {
                    var urlStore = upgradeDB.createObjectStore(KeySpaceDB.DB_TABLE_HTTP_URL, { keyPath: "url"});

                    console.log('Upgraded Table: ' + KeySpaceDB.DB_NAME + '.' + urlStore.name);
                }
            };

        } else if (typeof mongodb !== 'undefined') {
            var url = 'mongodb://localhost:27017/';
            console.info("MongoClient.connect(", url, ")");

            MongoClient.connect(url, function(err, db) {
                if(err)
                    throw new Error(err);
                console.log("Connected: " + url);
                dbInst = db;

                var dbCollection = db.collection(KeySpaceDB.DB_TABLE_HTTP_CONTENT);
                //dbCollection.createIndex({"path", { unique: false });
                dbCollection.createIndex({"pgp_id_public": 1, "timestamp": 1}, { unique: true });
                dbCollection.createIndex({"pgp_id_public": 1, "path": 1});
                dbCollection.createIndex({"path": 1});
                dbCollection.createIndex({"timestamp": -1});

                for (var i = 0; i < onDBCallbacks.length; i++)
                    onDBCallbacks[i](db);
                onDBCallbacks = [];
            });
        }

    };

    KeySpaceDB.addVerifiedContentToDB = function(encryptedContent, pgp_id_public, path, timestamp, callback) {
        if(!path)
            throw new Error("Invalid Path");
        if(!timestamp)
            throw new Error("Invalid Timestamp");
        if(!pgp_id_public)
            throw new Error("Invalid PGP Public Key ID");

        var insertData = {
            'pgp_id_public': pgp_id_public,
            'path': path,
            'timestamp': timestamp,
            'content': encryptedContent
        };

        // Client browser should store verified content
        if(typeof IDBDatabase !== 'undefined')
            insertData['content_verified'] = verifiedContent;

        KeySpaceDB.insert(
            KeySpaceDB.DB_TABLE_HTTP_CONTENT,
            insertData,
            function(err, insertData) {
                if(callback)
                    callback(err, insertData);

                console.info("Added content to database: http://" + pgp_id_public + '.ks' + path);
            }
        );

        var url = ('socket://' + pgp_id_public + path);
        KeySpaceDB.addURLToDB(url, null);
    };

    KeySpaceDB.queryContent = function(contentURI, callback) {
        console.info("KeySpaceDB.queryContent(" + contentURI + ", ...)");
        var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(contentURI);
        if(!match)
            throw new Error("Invalid URI: " + contentURI);

        var scheme = match[2],
            host = match[4],
            contentPath = match[5].toLowerCase() || '';

        var publicKeyID = null;
        if(host) {
            match = /^([^.]*\.)?([a-f0-9]{16})\.ks$/i.exec(host);
            if (!match)
                throw new Error("Host must match [PGP KEY ID (16)].ks: " + contentURI);
            publicKeyID = match[2];
            publicKeyID = publicKeyID.substr(publicKeyID.length - 16);
        }


        KeySpaceDB(function(db) {
            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                    .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                var pathIndex = dbStore.index(KeySpaceDB.DB_INDEX_PATH);
                var queryValueID = contentPath;
                if(publicKeyID) {
                    pathIndex = dbStore.index(KeySpaceDB.DB_INDEX_ID_PATH);
                    queryValueID = [publicKeyID, contentPath];
                }
                var cursor = pathIndex.openCursor(queryValueID);
                cursor.onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        callback(null, cursor.value);
                        cursor.continue();
                    }
                };
                cursor.onerror = function(err) {
                    callback(err.toString());
                }

            } else if (typeof mongodb !== 'undefined' && db instanceof mongodb.Db) {
                var dbCollection = db.collection(KeySpaceDB.DB_TABLE_HTTP_CONTENT);
                var queryValueMD = {path: contentPath};
                if(publicKeyID)
                    queryValueMD['pgp_id_public'] = publicKeyID;
                dbCollection.find(queryValueMD, callback);

            } else {
                throw new Error("Invalid Database Driver");

            }
        });
    };

    KeySpaceDB.queryContentFeed = function(timespan, callback) {
        if(typeof timespan.length === 'undefined')
            timespan = [timespan, Date.now()];

        KeySpaceDB(function(db) {
            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                    .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                var timestampIndex = dbStore.index(KeySpaceDB.DB_INDEX_TIMESTAMP);
                var boundKeyRange = IDBKeyRange.bound(timespan[0], timespan[1], true, true);

                timestampIndex.openCursor(boundKeyRange)
                    .onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        callback(null, cursor.value);
                        cursor.continue();
                    }
                };

            } else if (typeof mongodb !== 'undefined' && db instanceof mongodb.Db) {
                var dbCollection = db.collection(KeySpaceDB.DB_TABLE_HTTP_CONTENT);
                dbCollection.find({
                    timestamp: { $gt: timespan[0], $lt: timespan[1] }
                }, callback);

            } else {
                throw new Error("Invalid Database");
            }
        });
    };

    KeySpaceDB.addURLToDB = function(url, referrerURL, callback) {
        if(!callback)
            callback = function(err, insertData) {
                if(err) {
                    if(!/constraint/i.test(err))
                        console.error("Error adding url to database: " + url, err);
                } else {
                    console.info("Added http url to database: " + insertData.url);
                }
            };

        KeySpaceDB.insert(
            KeySpaceDB.DB_TABLE_HTTP_URL,
            {
                'url': url.toLowerCase(),
                'url_original_case': url,
                'referrer ': referrerURL,
                'added': Date.now()
            },
            callback
        );
    };

    KeySpaceDB.listURLIndex = function(currentURL, callback) {

        var match = currentURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var contentURLHost = match[4];
        if(!contentURLHost)
            throw new Error("Invalid Host: " + currentURL);
        var contentURLPath = (match[5] || '')
            .replace(/^\/~/, '/home/' + contentURLHost);
        var contentURLParentPath = contentURLPath.replace(/[^\/]+\/$/, '') || '/';

        var paths = [[currentURL, '.']];
        var parentURL = 'socket://' + contentURLHost + contentURLParentPath;
        if(currentURL !== parentURL)
            paths.push([parentURL, '..']);

        KeySpaceDB(function(db) {
            var urlPrefix = currentURL.toLowerCase();
            if(urlPrefix[urlPrefix.length-1] !== '/')
                urlPrefix += '/';
            var transaction = db.transaction([KeySpaceDB.DB_TABLE_HTTP_URL], "readonly");
            var urlStore = transaction.objectStore(KeySpaceDB.DB_TABLE_HTTP_URL);

            var boundKeyRange = IDBKeyRange.bound(urlPrefix, urlPrefix + '\uffff', true, true);

            urlStore.openCursor(boundKeyRange)
                .onsuccess = function (e) {
                var cursor = e.target.result;
                if(cursor) {
                    cursor.continue();
                    var urlData = cursor.value;
                    var matchedURL = (urlData.url_original_case || urlData.url);
                    var match = matchedURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
                    var matchedURLHost = match[4];
                    var matchedURLPath = (match[5] || '')
                        .replace(/^\/~/, '/home/' + matchedURLHost);
                    paths.push([matchedURL, matchedURLPath]);
                } else {
                    callback(paths);
                }
            };
        });
    };


    // Support


    KeySpaceDB.insert = function(tableName, insertData, callback) {
        KeySpaceDB(function(db) {
            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([tableName], "readwrite")
                    .objectStore(tableName);

                var insertRequest = dbStore.add(insertData);
                insertRequest.onsuccess = function(e) {
                    if(callback)
                        callback(null, insertData, insertRequest);
                };
                insertRequest.onerror = function(e) {
                    if(callback)
                        callback(e.target.error, null);
                };

            } else if (typeof mongodb !== 'undefined' && db instanceof mongodb.Db) {
                var dbCollection = db.collection(tableName);
                dbCollection.insert(insertData);
                callback(null, insertData);

            } else {
                throw new Error("Invalid Database Driver");
            }
        });
    };


    exports.test = function() {
        KeySpaceDB();

        var options = {
            numBits: 512,
            userId: 'Test <test@example.org>'
        };

        var openpgp = self.openpgp;
        if(typeof self.openpgp === 'undefined')
            openpgp = require('openpgp');

        //console.log("Generating test keypair...");
        openpgp.generateKeyPair(options)
            .then(function(keypair) {
            var postContent = '<article data-path="/test/path" data-timestamp="' + Date.now() + '"></article>';
                var newPrivateKeyID = keypair.key.primaryKey.getKeyId().toHex().toUpperCase();
                var newPublicKeyID = keypair.key.subKeys[0].subKey.getKeyId().toHex().toUpperCase();

                openpgp.encryptMessage(keypair.key, postContent)
                .then(function(pgpEncryptedContent) {
                    setTimeout(function() {
                        KeySpaceDB.verifyAndAddContentToDB(pgpEncryptedContent, postContent, function() {
                            KeySpaceDB.queryContent('http://' + newPublicKeyID + '.ks/test/path', function(err, content) {
                                //console.log("Content: ", err, content);
                            })
                        });
                    },1);
                });
            KeySpaceDB.addURLToDB('http://test.ks/path', 'http://test.ks/referrer');
        })
    };

})();

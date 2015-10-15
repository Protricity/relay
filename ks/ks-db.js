/**
 * Created by ari on 7/2/2015.
 */
"use strict";
if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.KeySpaceDB = KeySpaceDB;


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
            return callback(null, dbInst);
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
                    onDBCallbacks[i](null, dbInst);
                onDBCallbacks = [];
            };

            openRequest.onerror = function (e) {
                var err = e.target.result;
                for (var i = 0; i < onDBCallbacks.length; i++)
                    onDBCallbacks[i](err, null);
                onDBCallbacks = [];
                throw new Error(err);
            };

            openRequest.onupgradeneeded = function (e) {
                var upgradeDB = e.target.result;
                var transaction = e.target.transaction;

                if(!upgradeDB.objectStoreNames.contains(KeySpaceDB.DB_TABLE_HTTP_CONTENT)) {
                    var postStore = upgradeDB.createObjectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT, { keyPath: ["pgp_id_public", "timestamp"] });
                    postStore.createIndex(KeySpaceDB.DB_INDEX_PATH, ["path", "timestamp"], { unique: false });
                    postStore.createIndex(KeySpaceDB.DB_INDEX_ID_PATH, ["pgp_id_public", "path", "timestamp"], { unique: false });
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
                if(err) {
                    for (var j = 0; j < onDBCallbacks.length; j++)
                        onDBCallbacks[j](err, db);
                    onDBCallbacks = [];
                    return;
                }

                console.log("Connected: " + url);
                dbInst = db;

                var dbCollection = db.collection(KeySpaceDB.DB_TABLE_HTTP_CONTENT);
                //dbCollection.createIndex({"path", { unique: false });
                dbCollection.createIndex({"pgp_id_public": 1, "timestamp": -1}, { unique: true });
                dbCollection.createIndex({"pgp_id_public": 1, "path": 1, "timestamp": -1});
                dbCollection.createIndex({"path": 1, "timestamp": -1});
                dbCollection.createIndex({"timestamp": -1});

                for (var i = 0; i < onDBCallbacks.length; i++)
                    onDBCallbacks[i](err, db);
                onDBCallbacks = [];
            });
        }

    };

    KeySpaceDB.addVerifiedContentToDB = function(verifiedContent, pgp_id_public, path, timestamp, customFields, callback) {
        if(!path)
            throw new Error("Invalid Path");
        if(!timestamp)
            throw new Error("Invalid Timestamp");
        if(!pgp_id_public)
            throw new Error("Invalid PGP Public Key ID");

        if(path[0] === '/')
            path = path.substr(1);
        pgp_id_public = pgp_id_public.toUpperCase();

        var insertData = {
            'pgp_id_public': pgp_id_public,
            'path': path,
            'timestamp': timestamp,
            'content': verifiedContent
        };
        for(var customField in customFields)
            if(customFields.hasOwnProperty(customField))
                if(typeof insertData[customField] === 'undefined')
                    insertData[customField] = customFields[customField];

        // Client browser should store verified content
        //if(typeof IDBDatabase !== 'undefined')
        //    insertData['content_verified'] = verifiedContent;

        KeySpaceDB.insert(
            KeySpaceDB.DB_TABLE_HTTP_CONTENT,
            insertData,
            function(err, insertData) {
                if(callback)
                    callback(err, insertData);

                console.info("Added content to database: http://" + pgp_id_public + '.ks/' + path);
            }
        );

        var url = ('http://' + pgp_id_public + '.ks/' + path);
        KeySpaceDB.addURLToDB(url, null);
    };

    KeySpaceDB.deleteContent = function(publicKeyID, timestamp, callback) {
        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

            if (typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                    .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                var deleteRequest = dbStore.delete([publicKeyID, timestamp]);

                deleteRequest.onsuccess = function(e) {
                    callback(null, deleteRequest);
                };
                deleteRequest.onerror = function(e) {
                    callback(e.target, deleteRequest);
                };
            }
        });
    };

    KeySpaceDB.getContent = function(publicKeyID, timestamp, callback) {
        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

            if (typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                    .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                var getRequest = dbStore.get([publicKeyID, timestamp]);

                getRequest.onsuccess = function(e) {
                    callback(null, e.target.result, getRequest);
                };
                getRequest.onerror = function(e) {
                    callback(e.target, null, getRequest);
                };
            }
        });
    };

    KeySpaceDB.queryOne = function(contentURL, callback) {
        var done = false;
        KeySpaceDB.queryAll(contentURL, function(err, content) {
            if(!done) {
                done = true;
                callback(err, content);
            }
        })
    };

// TODO listings and variables
// TODO: calculate domain names that resolve to key ids
// TODO: D4819140521D4941.ks + [] => myspace.az12332432523.nks - [] => D4819140521D4941.ks
// TODO: 521D4941.ks + [] => myspace.abc123.nks - [] => 521D4941.ks
    KeySpaceDB.queryAll = function(contentURI, callback) {
        var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(contentURI);
        if(!match)
            throw new Error("Invalid URI: " + contentURI);

        var scheme = match[2],
            host = match[4],
            contentPath = match[5].toLowerCase() || '';

        if(contentPath[0] === '/')
            contentPath = contentPath.substr(1);
            
        var publicKeyID = null;
        if(host) {
            match = /^([^.]*\.)?([a-f0-9]{16})\.ks$/i.exec(host);
            if (!match)
                throw new Error("Host must match [PGP KEY ID (16)].ks: " + contentURI);
            publicKeyID = match[2].toUpperCase();
            publicKeyID = publicKeyID.substr(publicKeyID.length - 16);
        }

        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                    .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                var pathIndex = dbStore.index(KeySpaceDB.DB_INDEX_PATH);
                var queryRange = IDBKeyRange.bound([contentPath, 0], [contentPath, 2443566558308], true, true);
                if(publicKeyID) {
                    pathIndex = dbStore.index(KeySpaceDB.DB_INDEX_ID_PATH);
                    queryRange = IDBKeyRange.bound([publicKeyID, contentPath, 0], [publicKeyID, contentPath, 2443566558308], true, true);
                }
                var cursor = pathIndex.openCursor(queryRange, 'prev');
                cursor.onsuccess = function (e) {
                    //console.log(e, e.target.result, queryRange, pathIndex);
                    var cursor = e.target.result;
                    if (cursor) {
                        if(callback(null, cursor.value, cursor) !== true)
                            cursor.continue();

                    } else {
                            callback(null, null, cursor);
                    }
                };
                cursor.onerror = function(err) {
                    callback(err.toString(), null, cursor);
                }

            } else if (typeof mongodb !== 'undefined' && db instanceof mongodb.Db) {
                var dbCollection = db.collection(KeySpaceDB.DB_TABLE_HTTP_CONTENT);
                var queryValueMD = {path: contentPath};
                if(publicKeyID)
                    queryValueMD['pgp_id_public'] = publicKeyID;
                dbCollection.find(queryValueMD).each(callback);

            } else {
                throw new Error("Invalid Database Driver");

            }
        });
    };

    KeySpaceDB.queryContentFeed = function(timespan, callback) {
        if(typeof timespan.length === 'undefined')
            timespan = [timespan, Date.now()];

        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                    .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                var timestampIndex = dbStore.index(KeySpaceDB.DB_INDEX_TIMESTAMP);
                var boundKeyRange = IDBKeyRange.bound(timespan[0], timespan[1], true, true);

                timestampIndex.openCursor(boundKeyRange, 'prev')
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
                }).each(callback);

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
                        console.error("Error adding url to database: " + url, referrerURL, err);
                } else {
                    console.info("Added http url to database: " + insertData.url_original_case);
                }
            };

        var insertData = {
            'url': url.toLowerCase(),
            'url_original_case': url,
            'added': Date.now()
        };
        if(referrerURL)
            insertData['url_referrer'] = referrerURL;

        KeySpaceDB.insert(
            KeySpaceDB.DB_TABLE_HTTP_URL,
            insertData,
            callback
        );
    };

    KeySpaceDB.listURLIndex = function(currentURL, callback) {

        var match = currentURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var contentURLHost = match[4];
        if(!contentURLHost)
            throw new Error("Invalid Host: " + currentURL);
        var contentURLPath = (match[5] || '');
            //.replace(/^\/~/, '/home/' + /contentURLHost);
        var contentURLParentPath = contentURLPath.replace(/[^\/]+\/$/, '') || '/';

        var paths = [[currentURL, '.']];
        var parentURL = 'http://' + contentURLHost + contentURLParentPath;
        if(currentURL !== parentURL)
            paths.push([parentURL, '..']);

        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

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


    KeySpaceDB.insert = function(tableName, insertData, callback) {
        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

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


    module.exports.test = function() {
        KeySpaceDB();

        var options = {
            numBits: 512,
            userId: 'Test <test@example.org>'
        };

        if(typeof openpgp === 'undefined')
            var openpgp = require('openpgp');

        //console.log("Generating test keypair...");
        openpgp.generateKeyPair(options)
            .then(function(keypair) {
            var postContent = '<article data-path="/test/path" data-timestamp="' + Date.now() + '"></article>';
                var newPrivateKeyID = keypair.key.primaryKey.getKeyId().toHex().toUpperCase();
                var newPublicKeyID = keypair.key.subKeys[0].subKey.getKeyId().toHex().toUpperCase();

                openpgp.encryptMessage(keypair.key, postContent)
                .then(function(pgpEncryptedContent) {
                    setTimeout(function() {
                        KeySpaceDB.addVerifiedContentToDB(pgpEncryptedContent, newPublicKeyID, '/test/path', Date.now(), function() {
                            KeySpaceDB.queryOne('http://' + newPublicKeyID + '.ks/test/path', function(err, content) {
                                if(err)
                                    throw new Error(err);
                                //console.log("Content: ", err, content);
                            })
                        });
                    },1);
                });
            KeySpaceDB.addURLToDB('http://test.ks/path', 'http://test.ks/referrer');
        })
    };

})();

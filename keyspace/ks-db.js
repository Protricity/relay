/**
 * Created by ari on 7/2/2015.
 */
"use strict";
if (!module) var module = {exports: {}};
if (typeof self === 'undefined')
    var self = this;
module.exports.KeySpaceDB =
    typeof self.KeySpaceDB !== 'undefined' ? self.KeySpaceDB : self.KeySpaceDB =

(function() {
    // Config Database
    function KeySpaceDB(dbReadyCallback) {
        return KeySpaceDB.getDBInstance(dbReadyCallback);
    }
    self.KeySpaceDB = KeySpaceDB;

    KeySpaceDB.DB_VERSION               = 4;
    KeySpaceDB.DB_NAME                  = 'keyspace';
    KeySpaceDB.DB_TABLE_HTTP_CONTENT    = 'content';
    KeySpaceDB.DB_TABLE_HTTP_MESSAGE    = 'message';
//KeySpaceDB.DB_TABLE_HTTP_URL        = 'url';

    KeySpaceDB.DB_INDEX_PATH            = 'path';
    KeySpaceDB.DB_INDEX_ID_PATH         = 'id_path';
    KeySpaceDB.DB_INDEX_TIMESTAMP       = 'timestamp';
    KeySpaceDB.DB_INDEX_PUBLISHED       = 'published';

    KeySpaceDB.DB_INDEX_TO_ID           = 'to_id';
    KeySpaceDB.DB_INDEX_FROM_ID         = 'from_id';

    KeySpaceDB.DB_INDEX_RE              = 're';
    KeySpaceDB.DB_INDEX_UNPROCESSED     = 'unprocessed';
    KeySpaceDB.DB_INDEX_TAGS            = 'tags';

    KeySpaceDB.DB_PGP_KEY_LENGTH        = 8;

    if(typeof indexedDB === 'undefined')
        var mongodb     = require('mongodb'),
            MongoClient = mongodb.MongoClient;

    //var openpgp;
    //if(typeof importScripts === 'function') {
    //    self.module = {exports: {}};
    //    importScripts('pgp/lib/openpgpjs/openpgp.js');
    //    openpgp = self.module.exports;
    //
    //    self.module.exports = {KeySpaceDB: KeySpaceDB}; // Restore exports hack :(
    //
    //} else if (typeof require === 'function') {
    //    openpgp = require('openpgp');
    //}


    // Instance of Database
    var dbInst = null;
    
    // Array of callbacks to trigger once the Dataabse has been loaded
    var onDBCallbacks = [];
    
    // Database is connecting
    var connecting = false;
    
    // Pending GET/HEAD requests from client and server sockets
    var pendingSocketRequests = {};

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
            //console.info("indexedDB.open(", KeySpaceDB.DB_NAME, KeySpaceDB.DB_VERSION, ")");
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
                dbInst = null;
                throw new Error(err);
            };

            openRequest.onupgradeneeded = function (e) {
                var upgradeDB = e.target.result;
                var transaction = e.target.transaction;

                if(!upgradeDB.objectStoreNames.contains(KeySpaceDB.DB_TABLE_HTTP_CONTENT)) {
                    var contentStore = upgradeDB.createObjectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT, { keyPath: ["pgp_id_public", "timestamp"] });
                    contentStore.createIndex(KeySpaceDB.DB_INDEX_PATH, ["path", "timestamp"], { unique: false });
                    contentStore.createIndex(KeySpaceDB.DB_INDEX_ID_PATH, ["pgp_id_public", "path", "timestamp"], { unique: false });
                    contentStore.createIndex(KeySpaceDB.DB_INDEX_TIMESTAMP, "timestamp", { unique: false });
                    contentStore.createIndex(KeySpaceDB.DB_INDEX_PUBLISHED, ["published", "timestamp"], { unique: false });
                    contentStore.createIndex(KeySpaceDB.DB_INDEX_RE, "re", { unique: false });
                    contentStore.createIndex(KeySpaceDB.DB_INDEX_TAGS, "tags", { unique: false, multiEntry: true });

                    // TODO: check missing indexes on upgrade
                    console.log('Upgraded Table: ' + KeySpaceDB.DB_NAME + '.' + contentStore.name);
                }

                if(!upgradeDB.objectStoreNames.contains(KeySpaceDB.DB_TABLE_HTTP_MESSAGE)) {
                    var messageStore = upgradeDB.createObjectStore(KeySpaceDB.DB_TABLE_HTTP_MESSAGE, { autoIncrement: true });
                    messageStore.createIndex(KeySpaceDB.DB_INDEX_TO_ID, "to_pgp_id_public", { unique: false });
                    messageStore.createIndex(KeySpaceDB.DB_INDEX_FROM_ID, "from_pgp_id_public", { unique: false });
                    messageStore.createIndex(KeySpaceDB.DB_INDEX_RE, "re", { unique: false });
                    messageStore.createIndex(KeySpaceDB.DB_INDEX_UNPROCESSED, "unprocessed", { unique: false });

                    // TODO: check missing indexes on upgrade
                    console.log('Upgraded Table: ' + KeySpaceDB.DB_NAME + '.' + messageStore.name);
                }

                //if(upgradeDB.objectStoreNames.contains(KeySpaceDB.DB_TABLE_HTTP_CONTENT)) {
                //    upgradeDB.deleteObjectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);
                //    console.log('Deleted Table: ' + KeySpaceDB.DB_NAME + '.' + KeySpaceDB.DB_TABLE_HTTP_CONTENT);
                //}

                //if(!upgradeDB.objectStoreNames.contains(KeySpaceDB.DB_TABLE_HTTP_URL)) {
                //    var urlStore = upgradeDB.createObjectStore(KeySpaceDB.DB_TABLE_HTTP_URL, { keyPath: "url"});
                //
                //    console.log('Upgraded Table: ' + KeySpaceDB.DB_NAME + '.' + urlStore.name);
                //}
            };

        } else if (typeof mongodb !== 'undefined') {
            var url = 'mongodb://localhost:27017/';
            console.info("MongoClient.connect(", url, ")");

            MongoClient.connect(url, function(err, db) {
                if(err) {
                    for (var j = 0; j < onDBCallbacks.length; j++)
                        onDBCallbacks[j](err, db);
                    onDBCallbacks = [];
                    dbInst = null;
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


    KeySpaceDB.addEncryptedMessageToDB = function (encryptedMessageContent, to_pgp_id_public, from_pgp_id_public, customFields, callback) {
        if(!to_pgp_id_public)
            throw new Error("Invalid PGP Public Key ID");

        to_pgp_id_public = to_pgp_id_public.substr(to_pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH).toUpperCase();
        from_pgp_id_public = from_pgp_id_public.substr(from_pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH).toUpperCase();

        var insertData = {
            'to_pgp_id_public': to_pgp_id_public,
            'from_pgp_id_public': from_pgp_id_public,
            'content': encryptedMessageContent
        };

        for(var customField in customFields)
            if(customFields.hasOwnProperty(customField))
                if(typeof insertData[customField] === 'undefined')
                    insertData[customField] = customFields[customField];

        KeySpaceDB.insert(
            KeySpaceDB.DB_TABLE_HTTP_MESSAGE,
            insertData,
            function(err, insertData) {
                if(callback)
                    callback(err, insertData);

                 console.info("Added encrypted message to database", insertData);
            }
        );
    };

    KeySpaceDB.verifyAndAddContent = function(openpgp, unverifiedContent, pgp_id_public, callback) {
        callback = callback || function(err, insertData) {
            if(err)
                throw new Error(err);
            else
                console.info("Verified and Added content: ", insertData);
        };

        // TODO: check for encrypted rather than cleartext
        if(unverifiedContent.indexOf('-----BEGIN PGP SIGNED MESSAGE-----') === 0) {
            var pgpClearSignedMessage = openpgp.cleartext.readArmored(unverifiedContent);
            var verify_pgp_id_public = pgpClearSignedMessage.getEncryptionKeyIds()[0].toHex().toUpperCase();
            verify_pgp_id_public = verify_pgp_id_public.substr(verify_pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
            if(pgp_id_public && pgp_id_public.toUpperCase() !== verify_pgp_id_public)
                throw new Error("PGP Public Key ID Mismatch: " + pgp_id_public);
            pgp_id_public = verify_pgp_id_public;

            console.log(pgpClearSignedMessage);
            //var encIDs = getEncryptionKeyIds(pgpClearSignedMessage.packets);
            //var pgp_id_public = encIDs[0].toHex().toUpperCase();

            var path = /data-path=["'](\S+)["']/i.exec(pgpClearSignedMessage.text)[1];
            var timestamp =
                parseInt(/data-timestamp=["'](\d+)["']/i.exec(pgpClearSignedMessage.text)[1])
                || pgpClearSignedMessage.packets[0].created.getTime();
            // TODO: get signature packet

            // Query Vote Public Key for encrypting
            var requestURL = 'http://' + pgp_id_public + '.ks/public/id';
            KeySpaceDB.queryOne(requestURL, function (err, publicKeyBlock) {
                if (err) {
                    callback("ERROR " + err);
                    throw new Error(err);
                }
                if (!publicKeyBlock) {
                    callback("ERROR KeySpace content may only be added once the KeySpace public key block 'public/id' has been added");
                    throw new Error(err);
                }

                var pgpImport = openpgp.key.readArmored(publicKeyBlock.content);
                if(pgpImport.err && pgpImport.err.length > 0)
                    throw new Error(pgpImport.err[0]);
                var publicKeysForEncryption = pgpImport.keys;

                openpgp.verifyClearSignedMessage(publicKey, pgpClearSignedMessage)
                    .then(function (decryptedContent) {
                        for (var i = 0; i < decryptedContent.signatures.length; i++)
                            if (!decryptedContent.signatures[i].valid)
                                throw new Error("Invalid Signature: " + decryptedContent.signatures[i].keyid.toHex().toUpperCase());

                        console.info("Verified Signed Content for: " + pgp_id_public);

                        var keyspaceContent = pgpClearSignedMessage.armor().trim();

                        KeySpaceDB.addVerifiedContentToDB(keyspaceContent, pgp_id_public, timestamp, path, {},
                            function (err, insertData) {
                                if (err) {
                                    callback("ERROR " + err);
                                    throw new Error(err);
                                }

                                callback(null, insertData);
                            }
                        );

                    }).catch(function (err) {
                        console.error(err);
                        callback("ERROR " + err);
                    });
            });

        } else if(unverifiedContent.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') === 0) {
            var publicKey = openpgp.key.readArmored(unverifiedContent).keys[0];
            var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;
            var pkPath = 'public/id';
            var pkTimestamp = publicKeyCreateDate.getTime();
            var keyspaceContent = publicKey.armor();

            var verify_pgp_id_public2  = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            verify_pgp_id_public2 = verify_pgp_id_public2.substr(verify_pgp_id_public2.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
            if(pgp_id_public && pgp_id_public.toUpperCase() !== verify_pgp_id_public2)
                throw new Error("PGP Public Key ID Mismatch: " + pgp_id_public);
            pgp_id_public = verify_pgp_id_public2;

            // Add public key to cache.
            KeySpaceDB.addVerifiedContentToDB(keyspaceContent, pgp_id_public, pkTimestamp, pkPath, {},
                function(err, insertData) {
                    if (err) {
                        callback("ERROR " + err);

                    } else {
                        callback(null, insertData);
                    }
                });

        } else {
            throw new Error("No PGP Signed Message or Public Key found");
        }

    };

    KeySpaceDB.addVerifiedContentToDB = function(verifiedContent, pgp_id_public, timestamp, path, customFields, callback) {
        if(!path || typeof path !== 'string')
            throw new Error("Invalid Path");
        timestamp = parseInt(timestamp);
        if(!timestamp)
            throw new Error("Invalid Timestamp");
        if(!pgp_id_public)
            throw new Error("Invalid PGP Public Key ID");

        pgp_id_public = pgp_id_public.toUpperCase();
        pgp_id_public = pgp_id_public.substr(pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

        if(path[0] === '/')
            path = path.substr(1);
        path = path.toLowerCase();

        var insertData = {
            'pgp_id_public': pgp_id_public,
            //'path': path.toLowerCase(),
            //'path_original_case': path,
            'timestamp': timestamp,
            'content': verifiedContent
        };
        if(path)
            insertData.path = path;

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
            function(err, newInsertData) {
                if(callback)
                    callback(err?err.message:null, insertData);

                if(typeof Client !== 'undefined') {
                    var responseString = "EVENT KEYSPACE.INSERT" +
                        ' ' + insertData.pgp_id_public +
                        ' ' + insertData.timestamp +
                        (path ? ' ' + path : '');
                    Client.processResponse(responseString);
                }
                console.info("Added content to database: http://" + pgp_id_public + '.ks/' + path, insertData);
            }
        );

        //var url = ('http://' + pgp_id_public + '.ks/' + path);
        //KeySpaceDB.addURLToDB(url, null);
    };

    KeySpaceDB.deleteContent = function(pgp_id_public, timestamp, callback) {
        KeySpaceDB(function(err, db) {
            if (err)
                return callback(err);
            KeySpaceDB.getContent(pgp_id_public, timestamp,
                function (err, contentToDelete) {
                    if (err)
                        return callback(err);

                    if (typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                        var dbStore = db
                            .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                            .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                        var deleteRequest = dbStore.delete([pgp_id_public, timestamp]);

                        deleteRequest.onsuccess = function (e) {
                            callback(null, deleteRequest);

                            if (typeof Client !== 'undefined') {
                                var responseString = "EVENT KEYSPACE.DELETE" +
                                    ' ' + pgp_id_public +
                                    ' ' + timestamp +
                                    ' ' + contentToDelete.path;
                                Client.processResponse(responseString);
                            }
                        };
                        deleteRequest.onerror = function (e) {
                            callback(e.target, deleteRequest);
                        };
                    }
                }
            );
        });
    };

    KeySpaceDB.getContent = function(publicKeyID, timestamp, callback) {
        timestamp = parseInt(timestamp);
        if(!publicKeyID)
            throw new Error("Invalid Public Key");
        if(!timestamp)
            throw new Error("Invalid timestamp");
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
            } else {
                throw new Error("Not implemented");
            }
        });
    };

    //// TODO: refactor and use index on user_id?
    //KeySpaceDB.queryUserID = function(pgp_id_public, callback) {
    //    var requestURL = 'http://' + pgp_id_public + '.ks/public/id';
    //    KeySpaceDB.queryOne(requestURL, function(err, content) {
    //        if (content) {
    //            callback(err, content.user_id);
    //        } else {
    //            callback(err, null);
    //        }
    //    })
    //};


    KeySpaceDB.handleHTTPResponse = function(responseString, socket) {
        var match = /^http\/1.1 (\d+)\s?([\w ]*)/i.exec(responseString);
        if(!match)
            throw new Error("Invalid HTTP Response: " + responseString);

        var responseCode = parseInt(match[1]);
        var responseMessage = match[2];

        var pos = responseString.indexOf("\n\n");
        var responseHeaders = responseString;
        var responseBody = null;
        if(pos > 0) {
            responseHeaders = responseString.substr(0, pos);
            responseBody = responseString.substr(pos+2);
        }

        var headerLines = responseHeaders.split(/\n/g);
        var firstLine = headerLines.shift();
        responseHeaders = headerLines.join("\n");

        match = /^Request-ID: (\S)+$/im.exec(headerLines);
        if(match) {
            var requestID = match[1];
            if(typeof pendingSocketRequests[requestID] === 'undefined') {
                console.warn("Unhandled request ID: " + requestID);
                //send(client, "Unknown request ID: " + requestID);
                return false;
            }

            var callback = pendingSocketRequests[requestID][0];
            var pendingSocket = pendingSocketRequests[requestID][1];
            if(socket && socket !== pendingSocket)
                throw new Error("Socket Mismatch");
            var deleteCallback = callback(responseBody, responseCode, responseMessage, responseHeaders, pendingSocket);
            if(deleteCallback !== false)
                delete pendingSocketRequests[requestID];
            return true;
        }

        return false;
    };

    // Pass HEAD instead of GET to skip the body
    KeySpaceDB.executeSocketGETRequest = function(requestString, socket, callback) {
        var match = /^(head|get)\s+(\S+)/i.exec(requestString);
        if (!match)
            throw new Error("Invalid Socket GET/HEAD Request: " + requestString);

        var isHeadRequest = match[1].toLowerCase() === 'head';
        var requestID = "RG" + Date.now();
        if(typeof pendingSocketRequests[requestID] !== 'undefined')
            throw new Error("Duplicate Request ID: " + requestID);

        pendingSocketRequests[requestID] = [callback, socket];

        requestString = requestString.trim() +
            "\nRequest-ID: " + requestID;

        console.info("Executing Socket Request: " + requestString);
        socket.send(requestString);

    };

    /** 
     * Requests KeySpace content from the local database
     * @param {string} requestString 
     * @param {callback} callback
     */
    KeySpaceDB.executeLocalGETRequest = function(requestString, callback) {
        var match = /^(head|get)\s+(\S+)/i.exec(requestString);
        if (!match)
            throw new Error("Invalid Local GET/HEAD Request: " + requestString);
        
        // Request Type HEAD or GET?
        var requestType = match[1].toLowerCase();
        
        // Request URL
        var requestURL = match[2];

        // Query the local database
        KeySpaceDB.queryOne(requestURL, function (err, contentData) {

            var responseCode = 404;
            var responseText = "Not Found";
            var responseBody = "Not Found";
            if(contentData) {
                responseBody = contentData.content;
                responseCode = 200;
                responseText = "OK";

            } else if (err) {
                responseBody = err + '';
                responseText = err + '';
                responseCode = 400;
            }
            switch(requestType) {
                case 'head':
                    responseBody = '';
                    break;
            }
            callback(
                responseBody,
                responseCode,
                responseText,
                "Content-Type: text/html\n" +
                "Content-Length: " + responseBody.length + "\n" +
                "Request-URL: " + requestURL
                + (responseBody ? "\n\n" + responseBody : "")
            );
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

        while(contentPath[0] === '/')
            contentPath = contentPath.substr(1);

        var publicKeyID = null;
        if(host && host !== '*') {
            match = /^([^.]*\.)?([a-f0-9]{8,16})\.ks$/i.exec(host);
            if (!match)
                throw new Error("Host must match [PGP KEY ID (8 or 16)].ks: " + contentURI);
            publicKeyID = match[2].toUpperCase();
            publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
        }

        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                    .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                var contentPathLowBound = contentPath;
                var contentPathHighBound = contentPath;
                if(contentPath[contentPath.length-1] === '*') {
                    contentPathLowBound = contentPathLowBound.substr(0, contentPath.length-2);
                    contentPathHighBound = contentPathLowBound + '\uffff';
                }

                var pathIndex = dbStore.index(KeySpaceDB.DB_INDEX_PATH);
                var queryRange = IDBKeyRange.bound([contentPathLowBound, 0], [contentPathHighBound, 2443566558308], true, true);
                if(publicKeyID) {
                    pathIndex = dbStore.index(KeySpaceDB.DB_INDEX_ID_PATH);
                    queryRange = IDBKeyRange.bound([publicKeyID, contentPathLowBound, 0], [publicKeyID, contentPathHighBound, 2443566558308], true, true);
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
                dbCollection
                    .find(queryValueMD)
                    .each(callback);

            } else {
                throw new Error("Invalid Database Driver");

            }
        });
    };


    KeySpaceDB.queryContentFeed = function(feedEndTime, callback) {
        feedEndTime = parseInt(feedEndTime);
        if(!feedEndTime)
            throw new Error("Invalid Feed End Time");

        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite")
                    .objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

                //var publishedIndex = dbStore.index(KeySpaceDB.DB_INDEX_PUBLISHED);
                //var boundKeyRange = IDBKeyRange.upperBound([1, feedEndTime], true);

                var timestampIndex = dbStore.index(KeySpaceDB.DB_INDEX_TIMESTAMP);
                var boundKeyRange = IDBKeyRange.upperBound(feedEndTime, true);


                var cursorRequest = timestampIndex.openCursor(boundKeyRange, 'prev');
                cursorRequest.onsuccess = function (e) {

                    var cursor = e.target.result;
                    if (cursor) {
                        if(callback(null, cursor.value, cursorRequest) !== true)
                            cursor.continue();

                    } else {
                        callback(null, null, cursorRequest);
                    }
                };

            } else if (typeof mongodb !== 'undefined' && db instanceof mongodb.Db) {
                var dbCollection = db.collection(KeySpaceDB.DB_TABLE_HTTP_CONTENT);
                dbCollection.find({
                    published: 1,
                    timestamp: { $lt: feedEndTime }
                }).each(callback);

            } else {
                throw new Error("Invalid Database");
            }
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

    KeySpaceDB.update = function(tableName, updateData, callback) {
        callback = callback || function(err, updateData) {
            if(err)
                throw err;
            console.log("Update Successful", updateData);
        };
        KeySpaceDB(function(err, db) {
            if(err)
                return callback(err);

            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([tableName], "readwrite")
                    .objectStore(tableName);

                //if(updateQuery)
                //    throw new Error("Update query not implemented for indexeddb yet");

                var updateRequest = dbStore.put(updateData);
                updateRequest.onsuccess = function(e) {
                    callback(null, updateData, updateRequest);
                };
                updateRequest.onerror = function(e) {
                    callback(e.target.error, null);
                };

            } else if (typeof mongodb !== 'undefined' && db instanceof mongodb.Db) {
                var dbCollection = db.collection(tableName);
                dbCollection.update(null, updateData);
                //callback(null, insertData);

            } else {
                throw new Error("Invalid Database Driver");
            }
        });
    };


    //KeySpaceDB.addURLToDB = function(url, referrerURL, callback) {
    //    if(!callback)
    //        callback = function(err, insertData) {
    //            if(err) {
    //                if(!/(exists|constraint)/i.test(err.message || err))
    //                    console.error("Error adding url to database: " + err.message, url, referrerURL, err);
    //            } else {
    //                console.info("Added http url to database: " + insertData.url_original_case);
    //            }
    //        };
    //
    //    var insertData = {
    //        'url': url.toLowerCase(),
    //        'url_original_case': url,
    //        'added': Date.now()
    //    };
    //    if(referrerURL)
    //        insertData['url_referrer'] = referrerURL;
    //
    //    KeySpaceDB.insert(
    //        KeySpaceDB.DB_TABLE_HTTP_URL,
    //        insertData,
    //        callback
    //    );
    //};

    //KeySpaceDB.verifySignedContentWithKey = function(pgpSignedContent, publicKey, callback) {
    //
    //    var pgpClearSignedMessage = openpgp.cleartext.readArmored(pgpSignedContent);
    //    pgpSignedContent = pgpClearSignedMessage.armor();
    //    var pgp_id_public = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
    //    pgp_id_public = pgp_id_public.substr(pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
    //
    //    openpgp.verifyClearSignedMessage(publicKey, pgpClearSignedMessage)
    //        .then(function(decryptedContent) {
    //            for(var i=0; i<decryptedContent.signatures.length; i++)
    //                if(!decryptedContent.signatures[i].valid)
    //                    throw new Error("Invalid Signature: " + decryptedContent.signatures[i].keyid.toHex().toUpperCase());
    //
    //            decryptedContent.encrypted = pgpSignedContent;
    //            decryptedContent.pgp_id_public = pgp_id_public;
    //            console.info("Verified Signed Content for: " + pgp_id_public);
    //            callback(null, decryptedContent);
    //        })
    //        .catch(function(err) {
    //            callback(err, null);
    //        });
    //};

    //KeySpaceDB.verifySignedContent = function(pgpSignedContent, pgp_id_public, callback) {
    //
    //    if(!pgp_id_public) {
    //        var pgpClearSignedMessage = openpgp.cleartext.readArmored(pgpSignedContent);
    //        pgpSignedContent = pgpClearSignedMessage.armor();
    //        var encIDs = getEncryptionKeyIds(pgpClearSignedMessage.packets);
    //        pgp_id_public = encIDs[0].toHex().toUpperCase();
    //    }
    //
    //    // Query public key
    //    var path = 'http://' + pgp_id_public + '.ks/public/id';
    //    KeySpaceDB.queryOne(path, function(err, publicKeyBlock) {
    //        if(err)
    //            throw new Error(err);
    //        if(!publicKeyBlock)
    //            throw new Error("Public key not found: " + pgp_id_public);
    //
    //        var publicKey = openpgp.key.readArmored(publicKeyBlock.content).keys[0];
    //
    //        KeySpaceDB.verifySignedContentWithKey(pgpSignedContent, publicKey, callback);
    //    });
    //};

    //KeySpaceDB.verifyAndAddContentToDB = function(pgpSignedContent, pgp_id_public, timestamp, path, callback) {
    //    KeySpaceDB.verifySignedContent(
    //        pgpSignedContent,
    //        pgp_id_public,
    //        function(err, verifiedContent) {
    //            if(err)
    //                throw new Error(err);
    //
    //            KeySpaceDB.addVerifiedContentToDB(pgpSignedContent, pgp_id_public, timestamp, path, {}, callback);
    //        }
    //    );
    //};

    //
    //KeySpaceDB.verifyWithKeyAndAddContentToDB = function(pgpSignedContent, publicKey, timestamp, path, callback) {
    //    KeySpaceDB.verifySignedContentWithKey(
    //        pgpSignedContent,
    //        publicKey,
    //        function(err, verifiedContent) {
    //            if(err)
    //                throw new Error(err);
    //
    //            var pgp_id_public = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
    //            pgp_id_public = pgp_id_public.substr(pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
    //
    //            KeySpaceDB.addVerifiedContentToDB(pgpSignedContent, pgp_id_public, timestamp, path, {}, callback);
    //        }
    //    );
    //};


    //KeySpaceDB.listURLIndex = function(currentURL, callback) {
    //
    //    var match = currentURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
    //    var contentURLHost = match[4];
    //    if(!contentURLHost)
    //        throw new Error("Invalid Host: " + currentURL);
    //    var contentURLPath = (match[5] || '');
    //        //.replace(/^\/~/, '/home/' + /contentURLHost);
    //    var contentURLParentPath = contentURLPath.replace(/[^\/]+\/$/, '') || '/';
    //
    //    var paths = [[currentURL, '.']];
    //    var parentURL = 'http://' + contentURLHost + contentURLParentPath;
    //    if(currentURL !== parentURL)
    //        paths.push([parentURL, '..']);
    //
    //    KeySpaceDB(function(err, db) {
    //        if(err)
    //            return callback(err);
    //
    //        var urlPrefix = currentURL.toLowerCase();
    //        if(urlPrefix[urlPrefix.length-1] !== '/')
    //            urlPrefix += '/';
    //        var transaction = db.transaction([KeySpaceDB.DB_TABLE_HTTP_URL], "readonly");
    //        var urlStore = transaction.objectStore(KeySpaceDB.DB_TABLE_HTTP_URL);
    //
    //        var boundKeyRange = IDBKeyRange.bound(urlPrefix, urlPrefix + '\uffff', true, true);
    //
    //        urlStore.openCursor(boundKeyRange)
    //            .onsuccess = function (e) {
    //            var cursor = e.target.result;
    //            if(cursor) {
    //                cursor.continue();
    //                var urlData = cursor.value;
    //                var matchedURL = (urlData.url_original_case || urlData.url);
    //                var match = matchedURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
    //                var matchedURLHost = match[4];
    //                var matchedURLPath = (match[5] || '')
    //                    .replace(/^\/~/, '/home/' + matchedURLHost);
    //                paths.push([matchedURL, matchedURLPath]);
    //            } else {
    //                callback(paths);
    //            }
    //        };
    //    });
    //};


    //module.exports.test = function() {
    //    KeySpaceDB();
    //
    //    var options = {
    //        numBits: 512,
    //        userId: 'Test <test@example.org>'
    //    };
    //
    //    if(typeof openpgp === 'undefined')
    //        var openpgp = require('pgp/lib/openpgpjs/openpgp.js');
    //
    //    //console.log("Generating test keypair...");
    //    openpgp.generateKeyPair(options)
    //        .then(function(keypair) {
    //        var postContent = '<article data-path="/test/path" data-timestamp="' + Date.now() + '"></article>';
    //            var newPrivateKeyID = keypair.key.primaryKey.getKeyId().toHex().toUpperCase();
    //            var newPublicKeyID = keypair.key.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
    //
    //            openpgp.encryptMessage(keypair.key, postContent)
    //            .then(function(pgpEncryptedContent) {
    //                setTimeout(function() {
    //                    KeySpaceDB.addVerifiedContentToDB(pgpEncryptedContent, newPublicKeyID, '/test/path', Date.now(), function() {
    //                        KeySpaceDB.queryOne('http://' + newPublicKeyID + '.ks/test/path', function(err, content) {
    //                            if(err)
    //                                throw new Error(err);
    //                            //console.log("Content: ", err, content);
    //                        })
    //                    });
    //                },1);
    //            });
    //        KeySpaceDB.addURLToDB('http://test.ks/path', 'http://test.ks/referrer');
    //    })
    //};

    return KeySpaceDB;
})();

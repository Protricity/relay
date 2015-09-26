/**
 * Created by ari on 7/2/2015.
 */
"use strict";
if(!exports) var exports = {};
exports.KeySpaceDB = KeySpaceDB;

if(typeof indexedDB === 'undefined') {
    var sqlite3     = require('sqlite3');
    var indexeddbjs = require('indexeddb-js');

    var engine    = new sqlite3.Database(':memory:');
    var scope     = indexeddbjs.makeScope('sqlite3', engine);
    var indexedDB   = new indexeddbjs.indexedDB('sqlite3', engine);
    var IDBKeyRange = scope.IDBKeyRange;
}

if(typeof openpgp === 'undefined') {
    var openpgp = require('openpgp');
}


KeySpaceDB.DB_VERSION               = 1;
KeySpaceDB.DB_NAME                  = 'ks';
KeySpaceDB.DB_TABLE_HTTP_CONTENT    = 'content';
KeySpaceDB.DB_TABLE_HTTP_URL        = 'url';

KeySpaceDB.DB_INDEX_PATH            = 'path';
KeySpaceDB.DB_INDEX_ID_PATH         = 'id_path';
KeySpaceDB.DB_INDEX_PATH_TIMESTAMP  = 'path_timestamp';

// Config Database
function KeySpaceDB(dbReadyCallback) {

    if (typeof KeySpaceDB.getDBRequest === 'undefined') {
        // First Time
        var openRequest = indexedDB.open(KeySpaceDB.DB_NAME, KeySpaceDB.DB_VERSION);
        var onDBCallbacks = [];
        KeySpaceDB.getDBRequest = function() { return openRequest; };
        KeySpaceDB.getCallbacks = function () { return onDBCallbacks; };
        KeySpaceDB.addCallback = function (callback) { onDBCallbacks.push(callback); };

        openRequest.onsuccess = function (e) {
            for (var i = 0; i < onDBCallbacks.length; i++)
                onDBCallbacks[i](openRequest.result);
            onDBCallbacks = [];
        };

        openRequest.onerror = function (e) {
            var err = e.target.result;
            throw new Error(err);
        };

        openRequest.onupgradeneeded = function (e) {
            var upgradeDB = e.target.result;
            var transaction = e.target.transaction;

            if(upgradeDB.objectStoreNames.indexOf(KeySpaceDB.DB_TABLE_HTTP_CONTENT) === -1) {
                var postStore = upgradeDB.createObjectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT, { keyPath: ["pgp_id_public", "timestamp"] });
                postStore.createIndex(KeySpaceDB.DB_INDEX_PATH, "path", { unique: false });
                postStore.createIndex(KeySpaceDB.DB_INDEX_ID_PATH, ["pgp_id_public", "path"], { unique: false });
                postStore.createIndex(KeySpaceDB.DB_INDEX_PATH_TIMESTAMP, ["path", "timestamp"], { unique: false });
                //postStore.createIndex(KeySpaceDB.DB_INDEX_PGP_ID_PUBLIC, "pgp_id_public", { unique: false });
                //postStore.createIndex(KeySpaceDB.DB_INDEX_TIMESTAMP, "timestamp", { unique: false });

                console.log('Upgraded Table: ' + KeySpaceDB.DB_NAME + '.' + postStore.name);
            }

            if(upgradeDB.objectStoreNames.indexOf(KeySpaceDB.DB_TABLE_HTTP_URL) === -1) {
                var urlStore = upgradeDB.createObjectStore(KeySpaceDB.DB_TABLE_HTTP_URL, { keyPath: "url"});

                console.log('Upgraded Table: ' + KeySpaceDB.DB_NAME + '.' + urlStore.name);
            }

        };
    }

    var dbRequest = KeySpaceDB.getDBRequest();
    if (dbRequest.readyState === "done") {
        dbReadyCallback(dbRequest.result);
        return;
    }
    KeySpaceDB.addCallback(dbReadyCallback);
}

// Database Methods

KeySpaceDB.verifyEncryptedContent = function(pgpMessageContent, callback) {
    var pgpSignedMessage = openpgp.message.readArmored(pgpMessageContent);
    var encIDs = pgpSignedMessage.getSigningKeyIds();
    var feedKeyID = encIDs[0].toHex().toUpperCase();

    PGPDB.getPublicKeyData(feedKeyID, function (pkData) {
        if(!pkData)
            throw new Error("Public Key Block not found for: " + feedKeyID);
        var publicKey = openpgp.key.readArmored(pkData.block_public);

        openpgp.verifyClearSignedMessage(publicKey.keys, pgpSignedMessage)
        .then(function(verifiedContent) {
            for(var i=0; i<verifiedContent.signatures.length; i++)
                if(!verifiedContent.signatures[i].valid)
                    throw new Error("Invalid Signature: " + verifiedContent.signatures[i].keyid.toHex().toUpperCase());

            verifiedContent.encrypted = pgpMessageContent;
            verifiedContent.signingKeyId = feedKeyID;
            callback(null, verifiedContent);
        })
        .catch(function(err) {
            callback(err, null);
        });
    });

};

KeySpaceDB.addVerifiedContentToDB = function(encryptedContent, verifiedContent, callback) {

    var pgpMessage = openpgp.message.readArmored(encryptedContent);
    var encIDs = pgpMessage.getEncryptionKeyIds();
    var pgp_id_public = encIDs[0].toHex().toUpperCase();

    var path = /data-path=["'](\S+)["']/i.exec(verifiedContent)[1];
    var timestamp = parseInt(/data-timestamp=["'](\d+)["']/i.exec(verifiedContent)[1]);
    if(!path)
        throw new Error("Invalid Channel");
    if(!timestamp)
        throw new Error("Invalid Timestamp");

    KeySpaceDB(function(db) {

        var transaction = db.transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readwrite");
        var httpContentStore = transaction.objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

        var insertData = {
            'pgp_id_public': pgp_id_public,
            'path': path,
            'timestamp': timestamp,
            'content_encrypted': encryptedContent,
            'content_verified': verifiedContent
        };

        var insertRequest = httpContentStore.add(insertData);
        insertRequest.onsuccess = function(e) {
            console.log("Added http content to database: " + path, insertData);

            var url = ('socket://' + pgp_id_public + path);
            KeySpaceDB.addURLToDB(url, null);
            if(callback)
                callback(null, insertData, insertRequest);
        };
        insertRequest.onerror = function(e) {
            var err = e.target.error;
            var status_content = "Error adding content post to database: " + err.message;
            console.error(status_content, e);
            if(callback)
                callback(err, null);
        };
    });
};

KeySpaceDB.verifyAndAddContentToDB = function(pgpEncryptedPost, callback) {
    KeySpaceDB.verifyEncryptedContent(pgpEncryptedPost,
        function(err, verifiedContent) {
            if(err)
                throw new Error(err);
            KeySpaceDB.addVerifiedContentToDB(pgpEncryptedPost, verifiedContent, callback);
        }
    );
};

KeySpaceDB.getContent = function(contentURI, callback) {
    var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(contentURI);
    if(!match)
        throw new Error("Invalid URI: " + contentURI);

    var scheme = match[2],
        host = match[4],
        contentPath = match[5].toLowerCase() || '';
    if(!host)
        throw new Error("Invalid Host: " + contentURI);

    match = /^([^.]*\.)?([a-f0-9]{16})\.ks$/i.exec(host);
    if(!match)
        throw new Error("Host must match [PGP KEY ID (16)].ks: " + contentURI);
    var keyID = match[2];
    keyID = keyID.substr(keyID.length - 16);

    KeySpaceDB(function(db) {
        var transaction = db.transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

        var pathIndex = httpContentStore.index(KeySpaceDB.DB_INDEX_ID_PATH);
        var getRequest = pathIndex.get([keyID, contentPath]);
        getRequest.onsuccess = function (e) {
            var httpContentData = e.target.result;
            callback(httpContentData);
        };
    });
};

KeySpaceDB.getContentByPublicKeyID = function(path, publicKeyID, callback) {
    KeySpaceDB(function(db) {
        var transaction = db.transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

        var pathIndex = httpContentStore.index(KeySpaceDB.DB_INDEX_ID_PATH);
        var getRequest = pathIndex.get([path, publicKeyID]);
        getRequest.onsuccess = function(e) {
            var httpContentData = e.target.result;
            callback(null, httpContentData);
        };
        getRequest.onerror = function(e) {
            var err = event.target.error;
            callback(err, null);
        };
    });
};

KeySpaceDB.queryContentFeedByID = function(publicKeyID, timespan, callback) {
    //var id_public_short = publicKeyID.toUpperCase().substr(publicKeyID.length - 8);

    KeySpaceDB(function(db) {
        var transaction = db.transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

        var boundKeyRange = IDBKeyRange.bound([publicKeyID, timespan[0]], [publicKeyID, timespan[1]], true, true);

        httpContentStore.openCursor(boundKeyRange)
            .onsuccess = function (e) {
            var cursor = e.target.result;
            if(cursor) {
                callback(cursor.value);
                cursor.continue();
            }
        };
    });
};


KeySpaceDB.queryContentFeedByPath = function(pathPrefix, timespan, callback) {
    KeySpaceDB(function(db) {
        var transaction = db.transaction([KeySpaceDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(KeySpaceDB.DB_TABLE_HTTP_CONTENT);

        var pathTimeStampIndex = httpContentStore.index(KeySpaceDB.DB_INDEX_PATH_TIMESTAMP);
        var boundKeyRange = IDBKeyRange.bound([pathPrefix, timespan[0]], [pathPrefix + '\uffff', timespan[1]], true, true);
        pathTimeStampIndex.openCursor(boundKeyRange)
            .onsuccess = function (e) {
            var cursor = e.target.result;
            if(cursor) {
                callback(cursor.value);
                cursor.continue();
            }
        };
    });
};


KeySpaceDB.addURLToDB = function(url, referrerURL, callback) {
    if(!callback)
        callback = function(err, insertData) {
            if(err) {
                if(err.name !== "ConstraintError")
                    console.error("Error adding url to database: " + url, err);
            } else {
                console.info("Added http url to database: " + insertData.url);
            }
        };

    KeySpaceDB(function(db) {
        var transaction = db.transaction([KeySpaceDB.DB_TABLE_HTTP_URL], "readwrite");
        var httpContentStore = transaction.objectStore(KeySpaceDB.DB_TABLE_HTTP_URL);

        var insertData = {
            'url': url.toLowerCase(),
            'url_original_case': url,
            'referrer ': referrerURL,
            'added': Date.now()
        };

        var insertRequest = httpContentStore.add(insertData);
        insertRequest.onsuccess = function(event) {
            callback(null, insertData);
        };
        insertRequest.onerror = function(event) {
            var err = event.target.error;
            callback(err, null);
        };
    });
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

exports.test = function() {
    var options = {
        numBits: 512,
        userId: 'Test <test@example.org>'
    };

    //console.log("Generating test keypair...");
    openpgp.generateKeyPair(options)
        .then(function(keypair) {
        // success
        var privateKey = keypair.key;

        var postContent = '<article data-path="http://test.ks/path" data-timestamp="' + Date.now() + '"></article>';
        openpgp.encryptMessage(privateKey, postContent)
            .then(function(pgpEncryptedContent) {
                setTimeout(function() {
                    KeySpaceDB.addVerifiedContentToDB(pgpEncryptedContent, postContent);
                },1);
            });
        KeySpaceDB.addURLToDB('http://test.ks/path', 'http://test.ks/referrer');
        console.log('Test Complete: ' + __filename);
    })
};
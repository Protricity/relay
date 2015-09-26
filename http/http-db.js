/**
 * Created by ari on 7/2/2015.
 */
"use strict";
if(!exports) var exports = {};
exports.RestDB = RestDB;

RestDB.DB_VERSION               = 1;
RestDB.DB_NAME                  = 'rest';
RestDB.DB_TABLE_HTTP_CONTENT    = 'content';
RestDB.DB_TABLE_HTTP_URL        = 'url';

RestDB.DB_INDEX_PATH            = 'path';
RestDB.DB_INDEX_ID_PATH         = 'id_path';
RestDB.DB_INDEX_PATH_TIMESTAMP  = 'path_timestamp';
//RestDB.DB_INDEX_PGP_ID_PUBLIC   = 'pgp_id_public';
//RestDB.DB_INDEX_TIMESTAMP       = 'timestamp';

// Config Database
function RestDB(dbReadyCallback) {

    if (typeof RestDB.getDBRequest === 'undefined') {
        // First Time
        var openRequest = indexedDB.open(RestDB.DB_NAME, RestDB.DB_VERSION);
        var onDBCallbacks = [];
        RestDB.getDBRequest = function() { return openRequest; };
        RestDB.getCallbacks = function () { return onDBCallbacks; };
        RestDB.addCallback = function (callback) { onDBCallbacks.push(callback); };

        openRequest.onsuccess = function (e) {
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
            var transaction = e.currentTarget.transaction;

            if(!upgradeDB.objectStoreNames.contains(RestDB.DB_TABLE_HTTP_CONTENT)) {
                var postStore = upgradeDB.createObjectStore(RestDB.DB_TABLE_HTTP_CONTENT, { keyPath: ["pgp_id_public", "timestamp"] });
                postStore.createIndex(RestDB.DB_INDEX_PATH, "path", { unique: false });
                postStore.createIndex(RestDB.DB_INDEX_ID_PATH, ["pgp_id_public", "path"], { unique: false });
                postStore.createIndex(RestDB.DB_INDEX_PATH_TIMESTAMP, ["path", "timestamp"], { unique: false });
                //postStore.createIndex(RestDB.DB_INDEX_PGP_ID_PUBLIC, "pgp_id_public", { unique: false });
                //postStore.createIndex(RestDB.DB_INDEX_TIMESTAMP, "timestamp", { unique: false });

                console.log('Upgraded Table: ', postStore.name, postStore);
            }

            if(!upgradeDB.objectStoreNames.contains(RestDB.DB_TABLE_HTTP_URL)) {
                var urlStore = upgradeDB.createObjectStore(RestDB.DB_TABLE_HTTP_URL, { keyPath: "url"});

                console.log('Upgraded Table: ', urlStore.name, urlStore);
            }

        };
    }

    var dbRequest = RestDB.getDBRequest();
    if (dbRequest.readyState === "done") {
        dbReadyCallback(dbRequest.result);
        return;
    }
    RestDB.addCallback(dbReadyCallback);
}

// Database Methods

RestDB.verifySignedContent = function(pgpMessageContent, callback) {

    if(typeof self.openpgp === 'undefined') {
        importScripts('pgp/lib/support/polycrypt.js');
        importScripts('pgp/lib/openpgpjs/openpgp.js');
        console.log("Loaded: ", self.openpgp);
    }
    
    var pgpSignedMessage = openpgp.cleartext.readArmored(pgpMessageContent);
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
        });
    });

};

RestDB.addVerifiedContentToDB = function(verifiedContent, callback) {
    var verifiedText = verifiedContent.text;
    var pgpSignedContent = verifiedContent.encrypted;
    var pgp_id_public = verifiedContent.signingKeyId;
    //var pgp_id_public_short = pgp_id_public.substr(pgp_id_public.length - 8);
    var path = /data-path=["'](\S+)["']/i.exec(verifiedText)[1];
    var timestamp = parseInt(/data-timestamp=["'](\d+)["']/i.exec(verifiedText)[1]);
    if(!path)
        throw new Error("Invalid Channel");
    if(!timestamp)
        throw new Error("Invalid Timestamp");

    var pgpSignedMessage = openpgp.cleartext.readArmored(pgpSignedContent);
    console.log(pgpSignedMessage);
    //var pathLevel = -1;
    //path.replace(/\/+/g, function() { pathLevel++; });

    RestDB(function(db) {

        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readwrite");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

        var insertData = {
            //'uid': pgp_id_public + '-' + timestamp,
            'pgp_id_public': pgp_id_public,
            //'pgp_id_public_short': pgp_id_public_short,
            'path': path,
            //'path_level': pathLevel,
            'timestamp': timestamp,
            'content_signed': pgpSignedContent,
            'content_verified': verifiedText
        };

        var insertRequest = httpContentStore.add(insertData);
        insertRequest.onsuccess = function(event) {
            console.log("Added http content to database: " + path, insertData);

            var url = ('socket://' + pgp_id_public + path);
            RestDB.addURLToDB(url, null);
            if(callback)
                callback(null, insertData, insertRequest);
        };
        insertRequest.onerror = function(event) {
            var err = event.currentTarget.error;
            var status_content = "Error adding content post to database: " + err.message;
            console.error(status_content, event);
            if(callback)
                callback(err, null);
        };
    });
};

RestDB.verifyAndAddContentToDB = function(pgpSignedPost, callback) {
    RestDB.verifySignedContent(pgpSignedPost,
        function(err, verifiedContent) {
            if(err)
                throw new Error(err);
            RestDB.addVerifiedContentToDB(verifiedContent, callback);
        }
    );
};

RestDB.getContent = function(contentURI, callback) {
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

    RestDB(function(db) {
        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

        var pathIndex = httpContentStore.index(RestDB.DB_INDEX_ID_PATH);
        var getRequest = pathIndex.get([keyID, contentPath]);
        getRequest.onsuccess = function (e) {
            var httpContentData = e.target.result;
            callback(httpContentData);
        };
    });
};

RestDB.getContentByPublicKeyID = function(path, publicKeyID, callback) {
    RestDB(function(db) {
        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

        var pathIndex = httpContentStore.index(RestDB.DB_INDEX_ID_PATH);
        var getRequest = pathIndex.get([path, publicKeyID]);
        getRequest.onsuccess = function(e) {
            var httpContentData = e.target.result;
            callback(null, httpContentData);
        };
        getRequest.onerror = function(e) {
            var err = event.currentTarget.error;
            callback(err, null);
        };
    });
};

RestDB.queryContentFeedByID = function(publicKeyID, timespan, callback) {
    //var id_public_short = publicKeyID.toUpperCase().substr(publicKeyID.length - 8);

    RestDB(function(db) {
        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

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


RestDB.queryContentFeedByPath = function(pathPrefix, timespan, callback) {
    RestDB(function(db) {
        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

        var pathTimeStampIndex = httpContentStore.index(RestDB.DB_INDEX_PATH_TIMESTAMP);
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


RestDB.addURLToDB = function(url, referrerURL, callback) {
    if(!callback)
        callback = function(err, insertData) {
            if(err) {
                if(err.name !== "ConstraintError")
                    console.error("Error adding url to database: " + url, err);
            } else {
                console.info("Added http url to database: " + insertData.url);
            }
        };

    RestDB(function(db) {
        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_URL], "readwrite");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_URL);

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
            var err = event.currentTarget.error;
            callback(err, null);
        };
    });
};

RestDB.listURLIndex = function(currentURL, callback) {

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

    RestDB(function(db) {
        var urlPrefix = currentURL.toLowerCase();
        if(urlPrefix[urlPrefix.length-1] !== '/')
            urlPrefix += '/';
        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_URL], "readonly");
        var urlStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_URL);

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
    console.log('Test Complete: ' + __filename);
};
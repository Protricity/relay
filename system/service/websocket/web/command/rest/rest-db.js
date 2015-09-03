/**
 * Created by ari on 7/2/2015.
 */

RestDB.DB_NAME                  = 'http';
RestDB.DB_TABLE_HTTP_CONTENT    = 'content';

// Config Database
function RestDB(dbReadyCallback) {

    if (typeof RestDB.getDBRequest === 'undefined') {
        // First Time
        var openRequest = indexedDB.open(RestDB.DB_NAME, 2);
        var onDBCallbacks = [];
        RestDB.getDBRequest = function() { return openRequest; };
        RestDB.getCallbacks = function () { return onDBCallbacks; };
        RestDB.addCallback = function (callback) { onDBCallbacks.push(callback); };

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

            if(!upgradeDB.objectStoreNames.contains(RestDB.DB_TABLE_HTTP_CONTENT)) {
                var postStore = upgradeDB.createObjectStore(RestDB.DB_TABLE_HTTP_CONTENT, { keyPath: 'uid' });
                postStore.createIndex("path", "path", { unique: false });
                postStore.createIndex("id_path", ["path", "pgp_id_public"], { unique: false });
                postStore.createIndex("pgp_id_public", "pgp_id_public", { unique: false });
                postStore.createIndex("timestamp", "timestamp", { unique: false });

                console.log('Upgraded Table: ', RestDB.DB_TABLE_HTTP_CONTENT, postStore);
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

    PGPDB.getPublicKeyData(feedKeyID, function (err, pkData) {
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
    var path = /data-path=["'](\S+)["']/i.exec(verifiedText)[1];
    var timestamp = /data-timestamp=["'](\d+)["']/i.exec(verifiedText)[1];
    if(!path)
        throw new Error("Invalid Channel");
    if(!timestamp)
        throw new Error("Invalid Timestamp");

    //var pathLevel = -1;
    //path.replace(/\/+/g, function() { pathLevel++; });

    RestDB(function(db) {

        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readwrite");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

        var insertData = {
            'uid': pgp_id_public + '-' + timestamp,
            'pgp_id_public': pgp_id_public,
            'path': path,
            //'path_level': pathLevel,
            'timestamp': timestamp,
            'content_signed': pgpSignedContent,
            'content_verified': verifiedText
        };

        var insertRequest = httpContentStore.add(insertData);
        insertRequest.onsuccess = function(event) {
            console.log("Added http content to database: " + path, insertData);
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

RestDB.verifyAndAddContentToDB = function(pgpSignedPost, callback) {
    RestDB.verifySignedContent(pgpSignedPost,
        function(err, verifiedContent) {
            if(err)
                throw new Error(err);
            RestDB.addVerifiedContentToDB(verifiedContent, callback);
        }
    );
};

RestDB.getContent = function(path, callback) {
    RestDB(function(db) {
        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

        var pathIndex = httpContentStore.index('path');
        var getRequest = pathIndex.get(path);
        getRequest.onsuccess = function (e) {
            var httpContentData = e.target.result;
            callback(null, httpContentData);
        };
        getRequest.onerror = function (e) {
            var err = event.currentTarget.error;
            callback(err, null);
        };
    });
};

RestDB.getContentByPublicKeyID = function(path, publicKeyID, callback) {
    RestDB(function(db) {
        var transaction = db.transaction([RestDB.DB_TABLE_HTTP_CONTENT], "readonly");
        var httpContentStore = transaction.objectStore(RestDB.DB_TABLE_HTTP_CONTENT);

        var pathIndex = httpContentStore.index('id_path');
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
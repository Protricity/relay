/**
 * Created by ari on 7/2/2015.
 */

HttpDB.DB_NAME                  = 'http';
HttpDB.DB_TABLE_HTTP_CONTENT    = 'content';

// Config Database
function HttpDB(dbReadyCallback) {

    if (typeof HttpDB.getDBRequest === 'undefined') {
        // First Time
        var openRequest = indexedDB.open(HttpDB.DB_NAME, 2);
        var onDBCallbacks = [];
        HttpDB.getDBRequest = function() { return openRequest; };
        HttpDB.getCallbacks = function () { return onDBCallbacks; };
        HttpDB.addCallback = function (callback) { onDBCallbacks.push(callback); };

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

            if(!upgradeDB.objectStoreNames.contains(HttpDB.DB_TABLE_HTTP_CONTENT)) {
                var postStore = upgradeDB.createObjectStore(HttpDB.DB_TABLE_HTTP_CONTENT, { keyPath: 'uid' });
                postStore.createIndex("path", "path", { unique: false });
                postStore.createIndex("pgp_id_public", "pgp_id_public", { unique: false });
                postStore.createIndex("timestamp", "timestamp", { unique: false });

                console.log('Upgraded Table: ', HttpDB.DB_TABLE_HTTP_CONTENT, postStore);
            }

        };
    }

    var dbRequest = HttpDB.getDBRequest();
    if (dbRequest.readyState === "done") {
        dbReadyCallback(dbRequest.result);
        return;
    }
    HttpDB.addCallback(dbReadyCallback);
}

// Database Methods

HttpDB.verifySignedContent = function(pgpMessageContent, callback) {

    if(typeof self.openpgp === 'undefined') {
        importScripts('pgp/lib/support/polycrypt.js');
        importScripts('pgp/lib/openpgpjs/openpgp.js');
        console.log("Loaded: ", self.openpgp);
    }
    
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

HttpDB.addVerifiedContentToDB = function(verifiedContent, callback) {
    var verifiedText = verifiedContent.text;
    var pgpSignedContent = verifiedContent.encrypted;
    var pgp_id_public = verifiedContent.signingKeyId;
    var path = /data-path=["'](\S+)["']/i.exec(verifiedText)[1];
    var timestamp = /data-timestamp=["'](\d+)["']/i.exec(verifiedText)[1];
    if(!path)
        throw new Error("Invalid Channel");
    if(!timestamp)
        throw new Error("Invalid Timestamp");

    HttpDB(function(db) {

        var transaction = db.transaction([HttpDB.DB_TABLE_HTTP_CONTENT], "readwrite");
        var httpContentStore = transaction.objectStore(HttpDB.DB_TABLE_HTTP_CONTENT);

        var insertData = {
            'uid': pgp_id_public + '-' + timestamp,
            'pgp_id_public': pgp_id_public,
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

HttpDB.verifyAndAddContentToDB = function(pgpSignedPost, callback) {
    HttpDB.verifySignedContent(pgpSignedPost,
        function(err, verifiedContent) {
            if(err)
                throw new Error(err);
            HttpDB.addVerifiedContentToDB(verifiedContent, callback);
        }
    );
};
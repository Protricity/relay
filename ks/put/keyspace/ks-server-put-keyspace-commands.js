/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSPutKeySpaceCommands = function (SocketServer) {
        SocketServer.addCommand(putCommandSocket);
        SocketServer.addCommand(handleHTTPSocketResponse);
    };
    module.exports.initHTTPServerKSPutKeySpaceCommands = function (SocketServer) {
        SocketServer.addCommand(putCommandHTTP);
    };
})();

var pendingGETRequests = [];

function handleHTTPSocketResponse(responseString, client) {
    var match = /^http\/1.1\s+(\d+)\s+(\w+)\s+/im.exec(responseString);
    if(!match)
        return false;

    var responseCode = match[1];
    var responseMessage = match[2];

    var lines = responseString.split("\n\n", 2)[0].split(/\n/g);
    lines.shift();
    var responseHeaders = lines.join("\n");
    var responseBody = responseString.split("\n\n", 2)[1];

    match = /^Request-ID:\s+(\w+)/im.exec(responseHeaders);
    if(!match)
        return false;

    var requestID = match[1];

    var requestIndex = -1;
    for(var i=0; i<pendingGETRequests.length; i++)
        if(pendingGETRequests[i][0] === requestID)
            requestIndex = i;
    if(requestIndex === -1)
        throw new Error("Request ID not found: " + responseString);

    var pendingGETRequest = pendingGETRequests[requestIndex];
    pendingGETRequests.splice(requestIndex, 1);

    var pendingClient = pendingGETRequest[1];
    var pendingCallback = pendingGETRequest[2];
    if(pendingClient !== client)
        throw new Error("Invalid request ID: Client mismatch");
    if(pendingCallback)
        pendingCallback(responseBody, responseCode, responseMessage, responseHeaders, client);
    return true;
}
/**
 *
 * @param commandString PUT [pgp public id] [content]
 * @param client
 * @returns {boolean}
 */
function putCommandSocket(commandString, client) {
    var match = /^put\s+(\w+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        return false;

    var pgp_id_public = match[1] || null;
    var content = match[2];

    // Only encrypted messages or PGP Public Keys will be accepted
    var openpgp = require('openpgp');

    // TODO: check for encrypted rather than cleartext
    if(content.indexOf('-----BEGIN PGP SIGNED MESSAGE-----') === 0) {
        var pgpClearSignedMessage = openpgp.cleartext.readArmored(content);

        var path = /data-path=["'](\S+)["']/i.exec(pgpClearSignedMessage.text)[1];
        //var timestamp = parseInt(/data-timestamp=["'](\d+)["']/i.exec(pgpClearSignedMessage.text)[1]);
        var timestamp = pgpClearSignedMessage.packets[0].created.getTime(); // TODO: get signature packet

        // Query public key for verification
        requireClientPublicKey(pgp_id_public, client, function(err, publicKey) {
            if (err)
                return client.send("ERROR " + err);

            openpgp.verifyClearSignedMessage(publicKey, pgpClearSignedMessage)
                .then(function (decryptedContent) {
                    for (var i = 0; i < decryptedContent.signatures.length; i++)
                        if (!decryptedContent.signatures[i].valid)
                            throw new Error("Invalid Signature: " + decryptedContent.signatures[i].keyid.toHex().toUpperCase());

                    console.info("Verified Signed Content for: " + pgp_id_public);

                    var keyspaceContent = pgpClearSignedMessage.armor().trim();

                    var KeySpaceDB = require('../../ks-db.js').KeySpaceDB;
                    KeySpaceDB.addVerifiedContentToDB(keyspaceContent, pgp_id_public, timestamp, path, {},
                        function(err, insertData) {
                            if (err)
                                return client.send("ERROR " + err);

                            console.info("Cached Signed Content: " + pgp_id_public);
                            client.send("PUT.SUCCESS " + insertData.pgp_id_public + ' ' + insertData.timestamp);
                        });

                }).catch(function(err) {
                    console.error(err);
                    client.send("ERROR " + err);
                });
        });

    } else if(content.indexOf('-----BEGIN PUBLIC KEY BLOCK-----') === 0) {
                var publicKey = openpgp.key.readArmored(content).keys[0];
                var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;
                var pkPath = 'public/id';
                var pkTimestamp = publicKeyCreateDate.getTime();
                var keyspaceContent = publicKey.armor();

                // Add public key to cache.
                var KeySpaceDB = require('../../ks-db.js').KeySpaceDB;
                KeySpaceDB.addVerifiedContentToDB(keyspaceContent, pgp_id_public, pkTimestamp, pkPath, {},
                    function(err, insertData) {
                        if (err)
                            return client.send("ERROR " + err);

                        console.info("Cached Public Key for: " + pgp_id_public);
                        client.send("PUT.SUCCESS " + insertData.pgp_id_public + ' ' + insertData.timestamp);
                    });

    } else {
        throw new Error("No PGP Signed Message or Public Key found");
    }

    client.send("INFO Processing PUT request");

    return true;
}


function putCommandHTTP(request, response) {
    var commandString = request.method + ' ' + request.url;
    var match = /^put(?:\s+([\s\S]+))$/i.exec(commandString);
    if(!match)
        return false;

    var content = match[1];


    throw new Error(content);
}


function requireClientPublicKey(pgp_id_public, client, callback) {
    var KeySpaceDB = require('../../ks-db.js').KeySpaceDB;
    if(pgp_id_public.length < KeySpaceDB.DB_PGP_KEY_LENGTH)
        throw new Error("Invalid PGP Key ID (" + KeySpaceDB.DB_PGP_KEY_LENGTH + "): " + pgp_id_public);

    var requestPath = "/public/id";
    var requestURL = "http://" + pgp_id_public + ".ks" + requestPath;

    KeySpaceDB.queryOne(requestURL, function (err, contentData) {
        if (err)
            return callback(err);

        if (contentData) {
            var openpgp = require('openpgp');
            var publicKey = openpgp.key.readArmored(contentData.content).keys[0];
            var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
            //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();

            if(publicKeyID !== pgp_id_public)
                throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

            callback(null, publicKey, contentData.content);
            //console.info("Loaded Public Key from Cache: " + requestURL);

        } else {
            var requestID = 'S' + Date.now();
            console.info("Requesting Public Key from Client: " + requestURL);
            client.send("GET " + requestURL + "\nRequest-ID: " + requestID);
            pendingGETRequests.push([
                requestID,
                client,
                function(responseBody, responseCode, responseMessage, responseHeaders) {

                    var openpgp = require('openpgp');
                    var publicKey = openpgp.key.readArmored(responseBody).keys[0];
                    var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;
                    //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
                    var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                    publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                    if(publicKeyID !== pgp_id_public)
                        throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

                    callback(null, publicKey, responseBody);

                    var cacheKey = !/^cache-control:.*no-cache/im.test(responseHeaders); // TODO: support max-age=

                    if(cacheKey) {
                        // Cache Public Key
                        KeySpaceDB.addVerifiedContentToDB(publicKey.armor(), pgp_id_public, publicKeyCreateDate.getTime(), requestPath, {},
                            function(err, insertData) {
                                if(err)
                                    throw new Error(err);

                                console.info("Storing Public Key Cache: " + requestURL);
                            });
                    } else {

                    }
                }
            ]);
        }
    });
}

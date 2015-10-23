/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initSocketServerKSPutKeySpaceCommands = function(SocketServer) {
    SocketServer.addCommand(putCommandSocket);
};
module.exports.initHTTPServerKSPutKeySpaceCommands = function(SocketServer) {
    SocketServer.addCommand(putCommandHTTP);
};


function putCommandSocket(commandString, client) {
    var match = /^put\s+(\w+)\s+([\s\S]+)$/i.exec(commandString);
    if(!match)
        return false;

    var pgp_id_public = match[1] || null;
    var content = match[2];

    requireClientPublicKey(pgp_id_public, client, function(err, publicKey) {
        if(err)
            throw new Error(err);

        var KeySpaceDB = require('./ks-db.js').KeySpaceDB;

        // Only encrypted messages will be accepted
        var openpgp = require('openpgp');
        var pgpMessage = openpgp.cleartext.readArmored(content);
        var pgpSignedContent = pgpMessage.armor();
        //var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;

        KeySpaceDB.verifyWithKeyAndAddContentToDB(
            pgpSignedContent,
            publicKey,
            function (err, insertData) {
                if (err)
                    client.send("ERROR " + err);
                else
                    client.send("PUT.SUCCESS " + insertData.pgp_id_public + ' ' + insertData.timestamp);
            }
        );
    });

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
    if(pgp_id_public.length < 16)
        throw new Error("Invalid PGP Key ID (16): " + pgp_id_public);

    var requestPath = "/public/id";
    var requestURL = "http://" + pgp_id_public + ".ks" + requestPath;

    var KeySpaceDB = require('./ks-db.js').KeySpaceDB;

    KeySpaceDB.queryOne(requestURL, function (err, contentData) {
        if (err)
            return callback(err);


        if (contentData) {
            if(typeof openpgp === 'undefined')
                var openpgp = require('openpgp');
            var publicKey = openpgp.key.readArmored(contentData.content).keys[0];
            var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
            if(publicKeyID !== pgp_id_public)
                throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

            callback(null, publicKey, contentData.content);
            //console.info("Loaded Public Key from Cache: " + requestURL);

        } else {
            // TODO: review
            //console.info("Requesting Public Key from Client: " + requestURL);
            sendClientRequest("GET " + requestURL, client, function(responseBody, responseCode, responseMessage, responseHeaders) {


                if(typeof openpgp === 'undefined')
                    var openpgp = require('openpgp');
                var publicKey = openpgp.key.readArmored(responseBody).keys[0];
                var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;
                //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
                var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                if(publicKeyID !== pgp_id_public)
                    throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

                callback(null, publicKey, responseBody);

                var cacheKey = !/^cache-control:.*no-cache/im.test(responseHeaders); // TODO: support max-age=

                if(cacheKey) {
                    // Cache Public Key
                    KeySpaceDB.addVerifiedContentToDB(publicKey.armor(), pgp_id_public, requestPath, publicKeyCreateDate.getTime(), {},
                        function(err, insertData) {
                            if(err)
                                throw new Error(err);

                            console.info("Storing Public Key Cache: " + requestURL);
                        });
                } else {

                }

            });
        }
    });
}

function sendClientRequest(commandString, client, callback) {
    var requestID = getContentHeader(commandString, 'Request-ID') || null;
    if(!requestID) {
        requestID = 'S' + Date.now();
        commandString = addContentHeader(commandString, 'Request-ID', requestID);
    }
    pendingGETRequests[requestID] = [commandString, client, callback]; // TODO: reuse same callback? should be fine.
    client.send(commandString);
}

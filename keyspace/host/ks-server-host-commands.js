/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initSocketServerHostCommands = function (SocketServer) {
        SocketServer.addCommand(ksHostCommandSocket);
        SocketServer.addCommand(ksValidateCommandSocket);
        SocketServer.addCommand(ksHandleHTTPSocketResponse);
    };
})();

var keySpaceClients = {};
var keySpaceChallenges = {};
function ksHostCommandSocket(commandString, client) {
    var match = /^keyspace\.host\s+([a-f0-9]{16})$/i.exec(commandString);
    if(!match)
        return false;

    var pgp_id_public = match[1].substr(match[1].length - 8).toUpperCase();

    if(client.readyState !== client.OPEN)
        throw new Error("Client is not open");
    if(typeof keySpaceClients[pgp_id_public] === 'undefined')
        keySpaceClients[pgp_id_public] = [];

    var clientEntries = keySpaceClients[pgp_id_public];
    if(clientEntries.indexOf(client) >= 0) {
        client.send("ERROR Already hosting key space: " + pgp_id_public);
        throw new Error("Already hosting key space: " + pgp_id_public);
    }

    // Generate new challenge
    var hostCode = generateUID('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
    keySpaceChallenges[hostCode] = pgp_id_public;

    requestClientPublicKey(pgp_id_public, client, function(err, publicKey) {
        if(err)
            return client.send("ERROR " + err);

        if(typeof openpgp === 'undefined')
            var openpgp = require('openpgp');

        openpgp.encryptMessage(publicKey, hostCode)
            .then(function(encryptedMessage) {
                client.send("KEYSPACE.HOST.CHALLENGE " + encryptedMessage);

            }).catch(function(error) {
                client.send("ERROR " + error);
            });
    });

    return true;
}

function ksValidateCommandSocket(commandString, client) {
    var match = /^keyspace\.host.validate\s+(.*)?$/i.exec(commandString);
    if(!match)
        return false;

    var uid = match[1];
    if(!keySpaceChallenges[uid])
        throw new Error("Invalid Validation Key");

    var pgp_id_public = keySpaceChallenges[uid];
    delete keySpaceChallenges[uid];
    console.log("Validation Success: " + pgp_id_public + " => " + uid);

    if(typeof keySpaceClients[pgp_id_public] === 'undefined')
        keySpaceClients[pgp_id_public] = [];
    var clientEntries = keySpaceClients[pgp_id_public];
    if(clientEntries.indexOf(client) >= 0) {
        client.send("WARN Already hosting key space " + pgp_id_public);

    } else {
        clientEntries.push(client);
        client.send("KEYSPACE.HOST " + pgp_id_public);
    }
    return true;
}

// TODO: allow without database installed
function requestClientPublicKey(pgp_id_public, client, callback) {

    var requestPath = "public/id";
    var requestURL = "http://" + pgp_id_public + ".ks/" + requestPath;
    var loaded = false;

    var KeySpaceDB = require('../ks-db.js').KeySpaceDB;

    if(pgp_id_public.length < KeySpaceDB.DB_PGP_KEY_LENGTH)
        throw new Error("Invalid PGP Key ID Length (" + KeySpaceDB.DB_PGP_KEY_LENGTH + "): " + pgp_id_public);

    KeySpaceDB.queryOne(requestURL, function (err, contentData) {
        if (err)
            return callback(err);

        if(loaded)
            return;

        if (contentData) {
            if(typeof openpgp === 'undefined')
                var openpgp = require('openpgp');
            var publicKey = openpgp.key.readArmored(contentData.content).keys[0];
            var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
            publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
            if(publicKeyID !== pgp_id_public)
                throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

            callback(null, publicKey, contentData.content);
            //console.info("Loaded Public Key from Cache: " + requestURL);
            loaded = true;

        } else {
            // TODO: review
            console.info("Requesting Public Key from Client: " + requestURL);
            sendClientRequest("GET " + requestURL, client, function(responseBody, responseCode, responseMessage, responseHeaders) {
                if(typeof openpgp === 'undefined')
                    var openpgp = require('openpgp');
                var publicKey = openpgp.key.readArmored(responseBody).keys[0];
                var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;
                //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
                var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                if(publicKeyID !== pgp_id_public)
                    throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

                callback(null, publicKey, responseBody);

                // TODO: client config cache settings
                // Cache Public Key
                KeySpaceDB.addVerifiedContentToDB(publicKey.armor(), pgp_id_public, publicKeyCreateDate.getTime(), requestPath, {},
                    function(err, insertData) {
                        if(err)
                            throw new Error(err);

                        loaded = true;
                        console.info("Storing Public Key Cache: " + requestURL);
                    });
            });
        }
    });
}

var pendingGETRequests = [];
function ksHandleHTTPSocketResponse(responseString, client) {
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

    if(typeof pendingGETRequests[requestID] === 'undefined')
        return false;
    //throw new Error("Request ID not found: " + responseString);

    var pendingGETRequest = pendingGETRequests[requestID];

    var pendingClient = pendingGETRequest[1];
    var pendingCallback = pendingGETRequest[2];
    if(pendingClient !== client)
        throw new Error("Invalid request ID: Client mismatch");

    delete pendingGETRequests[requestID];

    if(pendingCallback)
        pendingCallback(responseBody, responseCode, responseMessage, responseHeaders, client);
    return true;
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

// Request/Response methods

// TODO: ignore body
function getContentHeader(contentString, headerName) {
    var match = new RegExp('^' + headerName + ': ([^$]+)$', 'mi').exec(contentString.split(/\n\n/)[0]);
    if(!match)
        return null;
    return match[1];
}

function addContentHeader(contentString, headerName, headerValue) {
    if(getContentHeader(contentString, headerName))
        throw new Error("Content already has Header: " + headerName);
    var lines = contentString.split(/\n/);
    lines.splice(lines.length >= 1 ? 1 : 0, 0, headerName + ": " + headerValue);
    return lines.join("\n");
}

function generateUID(format) {
    return (format).replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

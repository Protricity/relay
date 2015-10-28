/**
 * Created by ari.
 */
if(typeof module === 'object') {
    module.exports.initSocketServerAuthCommands = function (SocketServer) {
        SocketServer.addCommand(ksAuthCommandSocket);
        SocketServer.addCommand(ksValidateCommandSocket);
    };
}

var keySpaceClients = {};
var keySpaceChallenges = {};
function ksAuthCommandSocket(commandString, client) {
    var match = /^auth\s+(.*)$/i.exec(commandString);
    if(!match)
        return false;

    var ids = match[1].split(/\W+/);
    for(var i=0; i<ids.length; i++) {
        var id = ids[i];
        if(id.length < 16) {
            client.send("ERROR PGP ID must be at least 16 characters: " + id);

        } else {
            sendKeySpaceAuth(id, client);
        }
    }
    return true;
}

function ksValidateCommandSocket(commandString, client) {
    var match = /^auth.validate\s+(.*)?$/i.exec(commandString);
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
        client.send("INFO Hosting key space " + pgp_id_public);
    }
    return true;
}

function sendKeySpaceAuth(pgp_id_public, client) {
    if(client.readyState !== client.OPEN)
        throw new Error("Client is not open");
    if(typeof keySpaceClients[pgp_id_public] === 'undefined')
        keySpaceClients[pgp_id_public] = [];

    var clientEntries = keySpaceClients[pgp_id_public];
    if(clientEntries.indexOf(client) >= 0)
        throw new Error("Already hosting key space " + pgp_id_public);

    // Generate new challenge
    var authCode = generateUID('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
    keySpaceChallenges[authCode] = pgp_id_public;

    requestClientPublicKey(pgp_id_public, client, function(err, publicKey) {
        if(err)
            return client.send("ERROR " + err);

        if(typeof openpgp === 'undefined')
            var openpgp = require('openpgp');

        openpgp.encryptMessage(publicKey, authCode)
            .then(function(encryptedMessage) {
                client.send("AUTH.CHALLENGE " + encryptedMessage);

            }).catch(function(error) {
                client.send("ERROR " + error);
            });
    });
}

function requestClientPublicKey(pgp_id_public, client, callback) {
    if(pgp_id_public.length < 16)
        throw new Error("Invalid PGP Key ID (16): " + pgp_id_public);

    var requestPath = "public/id";
    var requestURL = "http://" + pgp_id_public + ".ks/" + requestPath;
    var loaded = false;

    var KeySpaceDB = require('../ks-db.js').KeySpaceDB;

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

/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initSocketServerHostCommands = function (SocketServer) {
        SocketServer.addCommand(ksHostSocketCommand);
        SocketServer.addCommand(ksValidateSocketCommand);
        SocketServer.addCommand(ksHandleHTTPSocketResponse);
        //SocketServer.addCommand(ksHostStatusSocketCommand);


        //SocketServer.addClientEventListener('close', ksSocketClientCloseListener);
    };
})();

var keySpaceClients = {};
var keySpaceChallenges = {};
var keySpaceSubscribers = [];

function sendToKeySpaceSubscribers(pgp_id_public, commandString) {
    if(typeof keySpaceSubscribers[pgp_id_public] !== 'undefined') {
        var subscribers = keySpaceSubscribers[pgp_id_public];
        for(var j=0; j<subscribers.length; j++) {
            if(subscribers[j].readyState !== subscribers[j].OPEN) {
                subscribers.splice(j--, 1);
                continue;
            }
            subscribers[j].send(commandString);
        }

        console.info("O" + subscribers.length + " " + commandString);
    }
}

function ksHostSocketCommand(commandString, client) {
    var match = /^keyspace\.(un)?host\.(get|put|post|status)?\s+([a-f0-9]{8,})$/i.exec(commandString);
    if(!match)
        return false;

    if(client.readyState !== client.OPEN)
        throw new Error("Client is not open");

    var KeySpaceDB = require('../ks-db.js').KeySpaceDB;

    var prefix = (match[1] || '').toLowerCase();
    var hostMode = (match[2] || '').toLowerCase();
    var pgp_id_public = match[3];
    pgp_id_public = pgp_id_public.substr(pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH).toUpperCase();


    if(typeof keySpaceClients[pgp_id_public] === 'undefined')
        keySpaceClients[pgp_id_public] = [];

    var clientEntries = keySpaceClients[pgp_id_public];
    if(prefix !== 'un') {
        if(clientEntries.indexOf(client) >= 0) {
            client.send("KEYSPACE.HOST.ONLINE " + pgp_id_public);
            client.send("ERROR Already hosting key space: " + pgp_id_public);
            throw new Error("Already hosting key space: " + pgp_id_public);
        }

        requestClientPublicKey(pgp_id_public, client, function(err, publicKey) {
            if(err) {
                console.error(err);
                return client.send("ERROR " + err);
            }

            if(typeof openpgp === 'undefined')
                var openpgp = require('openpgp');

            // Generate new challenge
            var hostCode = generateUID('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
            keySpaceChallenges[hostCode] = pgp_id_public;

            openpgp.encryptMessage(publicKey, hostCode)
                .then(function(encryptedMessage) {
                    client.send("KEYSPACE.HOST.CHALLENGE " + encryptedMessage);

                }).catch(function(error) {
                    client.send("ERROR " + error);
                });
        });

    } else {
        var pos = clientEntries.indexOf(client);
        if(pos === -1) {
            client.send("KEYSPACE.HOST.OFFLINE " + pgp_id_public);
            client.send("ERROR Not hosting key space: " + pgp_id_public);
            throw new Error("Not hosting key space: " + pgp_id_public);
        }
        clientEntries.splice(pos, 1);

        if(clientEntries.length === 0) {
            delete keySpaceClients[pgp_id_public];
            sendToKeySpaceSubscribers(pgp_id_public, "KEYSPACE.HOST.OFFLINE " + pgp_id_public);
        }
    }
    return true;
}

function ksValidateSocketCommand(commandString, client) {
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
        if(typeof client.keyspace === 'undefined')
            client.keyspace = [];

        if(client.keyspace.indexOf(pgp_id_public) === -1)
            client.keyspace.push(pgp_id_public);

        clientEntries.push(client);
        var clientSent = false;
        if(typeof keySpaceSubscribers[pgp_id_public] !== 'undefined') {
            var subscribers = keySpaceSubscribers[pgp_id_public];
            for(var i=0; i<subscribers.length; i++) {
                // Send KeySpace Status Update to all subscribers
                if(subscribers[i].readyState !== client.OPEN) {
                    subscribers.splice(i--, 1);
                    continue;
                }
                subscribers[i].send("KEYSPACE.HOST.ONLINE " + pgp_id_public);
                if(subscribers[i] === client)
                    clientSent = true;
            }
        }
        // Send status update to client if client wasn't one of the subscribers
        if(!clientSent)
            client.send("KEYSPACE.HOST.ONLINE " + pgp_id_public);
    }
    return true;
}

// TODO: allow without database installed
function requestClientPublicKey(pgp_id_public, client, callback) {

    var requestPath = "public/id";
    var requestURL = "http://" + pgp_id_public + ".ks/" + requestPath;

    // TODO: review
    console.info("Requesting Public Key from Client: " + requestURL);
    sendClientRequest("GET " + requestURL, client,
        function(responseBody, responseCode, responseMessage, responseHeaders) {

            var KeySpaceDB = require('../ks-db.js').KeySpaceDB;
            if(typeof openpgp === 'undefined')
                var openpgp = require('openpgp');

            var publicKey = openpgp.key.readArmored(responseBody).keys[0];
            //var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;
            //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
            var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
            if(publicKeyID !== pgp_id_public)
                throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

            callback(null, publicKey, responseBody);
        });

    // TODO: check if KeySpace DB is active and cache request
    //if(pgp_id_public.length < KeySpaceDB.DB_PGP_KEY_LENGTH)
    //    throw new Error("Invalid PGP Key ID Length (" + KeySpaceDB.DB_PGP_KEY_LENGTH + "): " + pgp_id_public);

    //KeySpaceDB.queryOne(requestURL, function (err, contentData) {
        //if (err)
        //    return callback(err);

        //if (!err && contentData) {
        //    if(typeof openpgp === 'undefined')
        //        var openpgp = require('openpgp');
        //    var publicKey = openpgp.key.readArmored(contentData.content).keys[0];
        //    var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
        //    var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
            //publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
            //if(publicKeyID !== pgp_id_public)
            //    throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

            //callback(null, publicKey, contentData.content);
            //console.info("Loaded Public Key from Cache: " + requestURL);

        //} else {

                // TODO: client config cache settings
                // Cache Public Key
                //KeySpaceDB.addVerifiedContentToDB(publicKey.armor(), pgp_id_public, publicKeyCreateDate.getTime(), requestPath, {},
                //    function(err, insertData) {
                //        if(err)
                //            throw new Error(err);
                //
                //        console.info("Storing Public Key Cache: " + requestURL);
                //    });
            //});
        //}
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

//function ksSocketClientCloseListener() {
//    var client = this;
//    console.info("KeySpace Client Closed: ", typeof client);
//
//    for(var pgp_id_public in keySpaceClients) {
//        if(keySpaceClients.hasOwnProperty(pgp_id_public)) {
//            var clients = keySpaceClients[pgp_id_public];
//            for(var i=0; i<clients.length; i++) {
//                if(clients[i].readyState !== client.OPEN
//                    || clients[i] === client) {
//                    clients.splice(i--, 1);
//                }
//            }
//
//            if(clients.length === 0) {
//                delete keySpaceClients[pgp_id_public];
//                sendToKeySpaceSubscribers(pgp_id_public, "KEYSPACE.HOST.OFFLINE " + pgp_id_public);
//            }
//        }
//    }
//    //SocketServer.addEventListener('connection', function(client) {
//    //    httpCommand("GET", client);
//    //});
//}


//function ksHostStatusSocketCommand(commandString, client) {
//    var match = /^keyspace\.host\.(un)?subscribe\s+([a-f0-9 ]{8,})$/i.exec(commandString);
//    if(!match)
//        return false;
//    console.info("I " + commandString);
//
//    var unsubscribe = match[1] ? true : false;
//    var uids = match[2].split(' ');
//
//    for(var i=0; i<uids.length; i++) {
//        var uid = uids[i].toUpperCase();
//
//        var KeySpaceDB = require('../ks-db.js').KeySpaceDB;
//
//        uid = uid.substr(uid.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
//        if(uid < KeySpaceDB.DB_PGP_KEY_LENGTH)
//            throw new Error("Invalid PGP Key ID Length (" + KeySpaceDB.DB_PGP_KEY_LENGTH + "): " + uid);
//
//        if(typeof keySpaceSubscribers[uid] === 'undefined')
//            keySpaceSubscribers[uid] = [];
//
//        var pos = keySpaceSubscribers[uid].indexOf(client);
//        if(pos === -1 && !unsubscribe) {
//            client.send("INFO Subscribed to KeySpace: " + uid);
//            keySpaceSubscribers[uid].push(client);
//        } else if(pos >= 0 && unsubscribe) {
//            client.send("INFO Unsubscribed to KeySpace: " + uid);
//            keySpaceSubscribers[uid].splice(pos, 1);
//        }
//    }
//    return true;
//}


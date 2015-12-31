/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSSubscribeCommands = function (SocketServer) {
        SocketServer.addCommand(ksAuthSocketCommand);
        SocketServer.addCommand(ksHandleHTTPSocketResponse);

        SocketServer.addCommand(ksSubscribeSocketCommand);
        SocketServer.addCommand(ksUnsubscribeSocketCommand);

        //SocketServer.addClientEventListener('close', ksSocketClientCloseListener);
    };
})();

var DEFAULT_MODE = 'EVENT';

var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

function ksAuthSocketCommand(commandString, client) {
    var match = /^(?:keyspaces?\.)?auth\s+([\S\s]*)$/im.exec(commandString);
    if (!match)
        return false;

    ServerSubscriptions.handleKeySpaceAuthenticationCommand(commandString, client);
    return true;
}


function ksSubscribeSocketCommand(commandString, client) {
    var match = /^(keyspaces?\.)?(un|re)?subscribe/i.exec(commandString);
    if (!match)
        return false;

    var oldSubscriptionString = ServerSubscriptions.handleClientSubscription(commandString, client);
    send(client, commandString);
    return true;
}

function ksUnsubscribeSocketCommand(commandString, client) {
    var match = /^(?:channel\.)?unsubscribe(?:\.(\w+))?\s+(\S+)$/im.exec(commandString);
    if (!match)
        return false;

    var mode = match[1] || DEFAULT_MODE;
    var channel = match[2];

    var oldArgString = ServerSubscriptions.handleClientSubscription(commandString, client);
    if(oldArgString) {
        var oldUserName = oldArgString.split(/\s+/)[0];
        var relayCommandString = "CHANNEL.UNSUBSCRIBE." + mode.toUpperCase() + " " + channel + " " + oldUserName;
        var clients = ServerSubscriptions.getChannelSubscriptions(channel, mode);
        for(var i=0; i<clients.length; i++) {
            var channelClient = clients[i][0];
            if(channelClient.readyState === channelClient.OPEN) {
                // Inform other subscribers
                send(channelClient, relayCommandString);
            }
        }

    } else {
        send(client, "ERROR Failed to unsubscribe: " + commandString);
    }
    return true;
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

    // Delete the request so it can't be reused
    delete pendingGETRequests[requestID];

    if(pendingCallback)
        pendingCallback(responseBody, responseCode, responseMessage, responseHeaders, client);
    return true;
}


function send(client, message) {
    if(client.readyState === client.OPEN) {
        client.send(message);
        console.info("O " + message);

    } else {
        console.warn("C " + message);
    }
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


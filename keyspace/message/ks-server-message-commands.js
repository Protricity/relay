/**
 * Created by ari.
 */

if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSMessageCommands = function (SocketServer) {
        SocketServer.addCommand(ksMessageCommandSocket);
    };
})();

var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

function ksMessageCommandSocket(commandString, client) {
    var match = /^(?:keyspace\.)?message\s+([a-f0-9]{8,})\s+([a-f0-9]{8,})\s*([\s\S]*)$/im.exec(commandString);
    if(!match)
        return false;

    var pgp_id_to = match[1].toUpperCase();
    var pgp_id_from = match[2].toUpperCase();

    if(!ServerSubscriptions.isKeySpaceAuthorized(pgp_id_from, client)) {
        send(client, "ERROR Only Authenticated KeySpace Clients may send private messages");
        return true;
    }
    if(!ServerSubscriptions.isKeySpaceAuthorized(pgp_id_to)) {
        send(client, "ERROR Only Authenticated KeySpace Clients may receive private messages");
        return true;
    }

    var content = match[3];

    var channelClients = ServerSubscriptions.getAuthenticatedKeySpaceClients(pgp_id_to);
    if(channelClients.length === 0)
        throw new Error("Empty Authenticated Client List");

    for(var i=0; i<channelClients.length; i++) {
        send(channelClients[i], commandString);
    }
    if(channelClients.indexOf(client) === -1)
        send(client, commandString);

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
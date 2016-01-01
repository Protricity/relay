/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSSearchCommands = function (SocketServer) {
        SocketServer.addCommand(ksSearchSocketCommand);
    };
})();

var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

var DEFAULT_MODE = 'event';

function ksSearchSocketCommand(commandString, client) {
    var match = /^keyspace\.search(?:\.(\w+))?\s*(.*)$/i.exec(commandString);
    if (!match)
        return false;

    var mode = (match[1] || DEFAULT_MODE).toLowerCase();
    var search = (match[2] || '').toLowerCase(); // TOD: allow regex
    // Get all clients via subscriptions, get all online keyspaces

    var keyspaceList = [];

    var channelCount = 0, clientCount = 0, keyspaceCount = 0;
    if(typeof client.channels !== 'undefined') {
        var channels = client.channels;
        for(var i=0; i<channels.length; i++) {
            channelCount++;
            var channel = channels[i];
            var subscriptions = ServerSubscriptions.getChannelSubscriptions(channel, mode);
            for(var j=0; j<subscriptions.length; j++) {
                var channelClient = subscriptions[j][0];
                var channelClientArgString = subscriptions[j][1];

                if(channelClient.readyState !== channelClient.OPEN)
                    continue;

                clientCount++;
                if(typeof channelClient.keyspaces !== 'undefined') {
                    var keyspaces = channelClient.keyspaces;

                    for(var k=0; k<keyspaces.length; k++) {
                        keyspaceCount++;
                        var pgp_id_public = keyspaces[k];
                        // Must be authenticated
                        if(false && !ServerSubscriptions.hasKeySpaceAuthentication(pgp_id_public, channelClient))
                            continue;

                        var user_id = ServerSubscriptions.getAuthenticatedKeySpaceUserID(pgp_id_public);
                        if(search && user_id.toLowerCase().indexOf(search) === -1)
                            continue;

                        var keyspaceStatus = ServerSubscriptions.getKeySpaceStatus(pgp_id_public).toLowerCase();
                        switch(keyspaceStatus) {
                            case 'offline':
                                continue;
                        }

                        var entry = pgp_id_public + (user_id ? ';' + user_id.replace(/;/g, ',') : '');
                        if(keyspaceList.indexOf(entry) === -1)
                            keyspaceList.push(entry);
                    }
                }

            }
        }
    }

    send(client, "KEYSPACE.SEARCH.RESULTS "
        + channelCount + " " + clientCount + " " + keyspaceCount
        + (keyspaceList.length > 0 ? "\n" + keyspaceList.join("\n") : ''));

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
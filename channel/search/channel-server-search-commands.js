/**
 * Channel Search Socket Commands
 * 
 * Provides server-side command handling for CHANNEL.SEARCH
 */
 
if(typeof module === 'object') (function() {
   /**
     * Initiates Server Command Handlers for the server thread
     **/
     module.exports.initSocketServerChannelSearchCommands = function (SocketServer) {
        SocketServer.addCommand(channelSearchCommandSocket);
    };
})();

var MAX_RESULTS = 500;

// Load ServerSubscriptions instance
var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

/**
 * Handles Command: CHANNEL.SEARCH [To: PGP ID] [From: PGP ID] [search]
 * @param {string} commandString The command string to process 
 * @param {object} client The client sender instance
 * @return {boolean} true if handled otherwise false
 **/
function channelSearchCommandSocket(commandString, client) {

    var match = /^(?:channel\.)?search(?:\.(\w+))?\s*(.*)$/i.exec(commandString);
    if (!match)         // If unmatched,
        return false;   // Pass control to next handler

    // Output to console
    console.info('I', commandString);

    var searchModes = ['chat', 'event'];
    if(match[1] && searchModes.indexOf(match[1].toLowerCase()) === -1)
        searchModes.push(match[1].toLowerCase());
    var search = (match[2] || '').toLowerCase(); // TOD: allow regex

    var channelList = [];

    var keyspaceCount = 0, clientCount = 0, channelCount = 0;
    if(typeof client.keyspaces !== 'undefined') {
        var keyspaces = client.keyspaces;

        // Grab all Keyspaces the client is subscribed to
        for(var i=0; i<keyspaces.length; i++) {
            keyspaceCount++;
            var pgp_id_public = keyspaces[i];

            //// Must be authenticated
            //if(false && !ServerSubscriptions.isKeySpaceAuthorized(channel, channelClient))
            //    continue;

            // Is this necessary for a search?
            //var keyspaceStatus = ServerSubscriptions.getKeySpaceStatus(pgp_id_public).toLowerCase();
            //switch(keyspaceStatus) {
            //    case 'disconnected': // TODO: is this logic correct?
            //    case 'offline':
            //        console.warn("Skipping " + keyspaceStatus + " client: " + pgp_id_public);
            //        continue;
            //}

            // Grab clients who are subscribed to this keyspace
            for(var mi=0; mi<searchModes.length; mi++) {
                var mode = searchModes[mi];
                var subscriptions = ServerSubscriptions.getKeySpaceSubscriptions(pgp_id_public, mode);

                for(var j=0; j<subscriptions.length; j++) {
                    var channelClient = subscriptions[j];

                    if(channelClient.readyState !== channelClient.OPEN)
                        continue;
                    clientCount++;

                    // Grab each client's channels to be used as suggestions
                    if(typeof channelClient.channels !== 'undefined') {
                        var channels = channelClient.channels;

                        for(var k=0; k<channels.length; k++) {
                            channelCount++;
                            var channel = channels[k];

                            if(search && channel.toLowerCase().indexOf(search) === -1)
                                continue;

                            if(channelList.length >= MAX_RESULTS)
                                break;
                            if(channelList.indexOf(channel) === -1)
                                channelList.push(channel);
                        }
                    }

                    if(channelList.length >= MAX_RESULTS)
                        break;
                }

                if(channelList.length >= MAX_RESULTS)
                    break;
            }
        }
    }

    send(client, "CHANNEL.SEARCH.RESULTS "
        + keyspaceCount + " " + clientCount + " " + channelCount
        + (channelList.length > 0 ? "\n" + channelList.join("\n") : ''));

    // TODO: proximity searches

    return true;
}

function send(client, search) {
    if(client.readyState === client.OPEN) {
        client.send(search);
        console.info("O " + search);

    } else {
        console.warn("C " + search);
    }
}

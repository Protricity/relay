/**
 * KeySpace Suggest Socket Commands
 * 
 * Provides server-side command handling for KEYSPACE.SUGGEST
 */
 
if(typeof module === 'object') (function() {
   /**
     * Initiates Server Command Handlers for the server thread
     **/
     module.exports.initSocketServerChannelSuggestCommands= function (SocketServer) {
        SocketServer.addCommand(ksSuggestCommandSocket);
    };
})();

// Load ServerSubscriptions instance
var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

/**
 * Handles Command: KEYSPACE.SUGGEST [To: PGP ID] [From: PGP ID] [suggest]
 * @param {string} commandString The command string to process 
 * @param {object} client The client sender instance
 * @return {boolean} true if handled otherwise false
 **/
function ksSuggestCommandSocket(commandString, client) {
    var match = /^(?:keyspace\.)?suggest/im.exec(commandString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler

    return true;
}

function send(client, suggest) {
    if(client.readyState === client.OPEN) {
        client.send(suggest);
        console.info("O " + suggest);

    } else {
        console.warn("C " + suggest);
    }
}

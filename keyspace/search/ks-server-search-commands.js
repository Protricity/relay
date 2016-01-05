/**
 * KeySpace Search Socket Commands
 * 
 * Provides server-side command handling for KEYSPACE.SEARCH
 */
 
if(typeof module === 'object') (function() {
   /**
     * Initiates Server Command Handlers for the server thread
     **/
    module.exports.initSocketServerKSSearchCommands = function (SocketServer) {
        SocketServer.addCommand(ksSearchSocketCommand);
    };
})();

// Load ServerSubscriptions instance
var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

var DEFAULT_MODE = 'event';

var MAX_RESULTS = 100;

/**
 * Handles Command: KEYSPACE.SEARCH [search]
 * @param {string} commandString The command string to process 
 * @param {object} client The client sender instance
 * @return {boolean} true if handled otherwise false
 **/
function ksSearchSocketCommand(commandString, client) {
    var match = /^keyspace\.search(?:\.(\w+))?\s*(.*)$/i.exec(commandString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler

    var searchModes = ['chat', 'event'];
    if(match[1] && searchModes.indexOf(match[1].toLowerCase()) === -1)
        searchModes.push(match[1].toLowerCase());
    var search = (match[2] || '').toLowerCase(); // TOD: allow regex
    // Get all clients via subscriptions, get all online keyspaces

    var keyspaceList = [];

    var channelCount = 0, clientCount = 0, keyspaceCount = 0;
    if(typeof client.channels !== 'undefined') {
        var channels = client.channels;
        for(var i=0; i<channels.length; i++) {
            channelCount++;
            var channel = channels[i];
            
            for(var mi=0; mi<searchModes.length; mi++) {
              var mode = searchModes[mi];
              var subscriptions = ServerSubscriptions.getChannelSubscriptions(channel, mode);
              //console.log(channel, mode, subscriptions);
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
                          if(false && !ServerSubscriptions.isKeySpaceAuthorized(pgp_id_public, channelClient))
                              continue;
  
                          var user_id = ServerSubscriptions.getAuthenticatedKeySpaceUserID(pgp_id_public);
                          if(!user_id)
                              user_id = pgp_id_public;
                          if(search && user_id.toLowerCase().indexOf(search) === -1)
                              continue;
  
                          var keyspaceStatus = ServerSubscriptions.getKeySpaceStatus(pgp_id_public).toLowerCase();
                          switch(keyspaceStatus) {
                              case 'disconnected': // TODO: is this logic correct?
                              case 'offline':
                                  console.warn("Skipping " + keyspaceStatus + " client: " + pgp_id_public);
                                  continue;
                          }
  
                          var entry = pgp_id_public + (user_id ? ';' + user_id.replace(/;/g, ',') : '');
                          if(keyspaceList.length >= MAX_RESULTS)
                              break;
                          if(keyspaceList.indexOf(entry) === -1)
                              keyspaceList.push(entry);
                      }
                  }
  
                  if(keyspaceList.length >= MAX_RESULTS)
                      break;
              }
  
              if(keyspaceList.length >= MAX_RESULTS)
                  break;
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

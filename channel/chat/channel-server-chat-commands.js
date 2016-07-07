/**
 * KeySpace Chat Socket Commands
 * 
 * Provides server-side command handling for KEYSPACE.CHAT
 */
 
if(typeof module === 'object') (function() {
    /**
    * Initiates Server Command Handlers for the server thread
    **/
    module.exports.initSocketServerChannelChatCommands= function (SocketServer) {
        SocketServer.addCommand(chatChannelSocketCommand);

        /**
         * Handles Command: CHANNEL.CHAT [channel] [message]
         * @param {string} commandString The command string to process
         * @param {object} client The client sender instance
         * @return {boolean} true if handled otherwise false
         **/
        function chatChannelSocketCommand(commandString, client) {
            var match = /^(?:channel\.)?chat\s+([^\s]+)\s*([\s\S]*)$/im.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            // Output to console
            console.info('I', commandString);

            var channel = match[1];
            var mode = "CHAT";
            var message = match[2];
            //var clientInfo = getClientInfo(client);

        // Load ServerSubscriptions instance
            var ServerSubscriptions =
                require('../../server/subscriptions/server-subscriptions.js')
                    .ServerSubscriptions;

            var username = null;
            var oldArgString = ServerSubscriptions.getClientChannelArgString(client, channel, mode);
            if(oldArgString) {
                username = oldArgString.split(' ')[0];

            } else {
                username = "guest-" + generateUID('xxxx');
                SocketServer.execute("CHANNEL.SUBSCRIBE.CHAT " + channel + " " + username, client);
                //ServerSubscriptions.handleClientSubscription("CHANNEL.SUBSCRIBE.CHAT " + channel + " " + username, client);
                oldArgString = ServerSubscriptions.getClientChannelArgString(client, channel, mode);
                if(!oldArgString)
                    throw new Error("Failed to auto-subscribe");
            }

            var relayCommandString = "CHANNEL.CHAT " + channel + " " + username + (message ? " " + message : "");
            var clients = ServerSubscriptions.getChannelSubscriptions(channel, mode);
            for(var i=0; i<clients.length; i++) {
                var channelClient = clients[i][0];
                if(channelClient.readyState === channelClient.OPEN) {
                    // Inform other subscribers
                    send(channelClient, relayCommandString);
                }
            }

            return true;
        }

    };
})();

function generateUID(format) {
    return (format).replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function send(client, chat) {
    if(client.readyState === client.OPEN) {
        client.send(chat);
        console.info("O " + chat);

    } else {
        console.warn("C " + chat);
    }
}

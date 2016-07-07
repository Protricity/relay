/**
 * KeySpace Subscribe Socket Commands
 * 
 * Provides server-side command handling for KEYSPACE.SUBSCRIBE
 */
 
if(typeof module === 'object') (function() {
   /**
     * Initiates Server Command Handlers for the server thread
     **/
     module.exports.initSocketServerChannelSubscribeCommands= function (SocketServer) {
         SocketServer.addCommand(channelSubscribeSocketCommand);
         SocketServer.addCommand(channelUnsubscribeSocketCommand);
    };
})();

// Load ServerSubscriptions instance
var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

var DEFAULT_MODE = 'event';


function generateUID(format) {
    return (format).replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}


// TODO: multiple
/**
 * Handles Command: CHANNEL.SUBSCRIBE[.mode] [channel] [arg1] [arg2..]
 * @param {string} commandString The command string to process
 * @param {object} client The client sender instance
 * @return {boolean} true if handled otherwise false
 **/
function channelSubscribeSocketCommand(commandString, client) {
    var match = /^(?:channel\.)?(?:re)?subscribe(?:\.(\w+))?\s+(\S+)\s*(\S*)\s*([\S\s]*)$/im.exec(commandString);
    if (!match)         // If unmatched,
        return false;   // Pass control to next handler

    // Output to console
    console.info('I', commandString);

    var mode = match[1] || DEFAULT_MODE;
    var channel = match[2];
    var firstArgString = match[3];
    if(!firstArgString)
        firstArgString = "guest-" + generateUID('xxxx');
    var argString = match[4];
    //var username = argString.split(/\s+/)[0] || 'unknown';

    try {
        // TODO: Refactor this block into class
        var oldArgString = ServerSubscriptions.handleClientSubscription(commandString, client);
        var relayCommandString = "CHANNEL.SUBSCRIBE." + mode.toUpperCase() + " " + channel + " " + firstArgString;

        if(oldArgString) {
            console.log("Resubscribing from old: " + oldArgString);
            //var oldArgStringPrefix = oldArgString.split(/\s+/)[0];
            relayCommandString = "CHANNEL.RESUBSCRIBE." + mode.toUpperCase() + " " + channel + " " + firstArgString;
        }

        // Userlist. TODO: Refactor?
        var channelClientUserList = [firstArgString + (argString ? ' ' + argString : '')];
        var clients = ServerSubscriptions.getChannelSubscriptions(channel, mode);
        var activeCount = 0;
        for (var i = 0; i < clients.length; i++) {
            var channelClient = clients[i][0];
            var channelClientArgString = clients[i][1];
            //var channelClientUsername = channelClientArgString.split(/\s+/)[0] || 'unknown';
            if (channelClient && channelClient.readyState === channelClient.OPEN) {
                // Relay to other subscribers
                send(channelClient, relayCommandString);
                activeCount++;
                // Add to user list
                if (channelClientUserList.indexOf(channelClientArgString) === -1)
                    channelClientUserList.push(channelClientArgString);
            } else {
                // TODO: invalid client?
            }
        }

        if(mode.toLowerCase() === 'chat') {
            send(client, "CHANNEL.USERLIST." + mode.toUpperCase() + " " + channel + "\n" + channelClientUserList.join("\n"));
        }
        send(client, "CHANNEL.USERCOUNT." + mode.toUpperCase() + " " + channel + " " + activeCount);


    } catch (e) {
        send(client, "ERROR " + e.message);
    }

    return true;
}

function channelUnsubscribeSocketCommand(commandString, client) {
    var match = /^(?:channel\.)?unsubscribe(?:\.(\w+))?\s+(\S+)$/im.exec(commandString);
    if (!match)
        return false;

    var mode = match[1] || DEFAULT_MODE;
    var channel = match[2];

    try {

        var oldArgString = ServerSubscriptions.handleClientSubscription(commandString, client);
        if(oldArgString === null) {
            send(client, "ERROR Failed to unsubscribe. No existing subscription: " + commandString);
            return true;
        }
        var oldUserName = oldArgString.split(/\s+/)[0];
        var relayCommandString = "CHANNEL.UNSUBSCRIBE." + mode.toUpperCase() + " " + channel + " " + oldUserName;
        var clients = ServerSubscriptions.searchChannelSubscriptions(channel, mode);
        for(var i=0; i<clients.length; i++) {
            var channelClient = clients[i][0];
            if(channelClient === client) {
                console.warn("Client is still in channel");
                continue;
            }
            if(channelClient.readyState === channelClient.OPEN) {
                // Inform other subscribers
                send(channelClient, relayCommandString);
            }
        }
        send(client, relayCommandString);

    } catch (e) {
        send(client, "ERROR " + e.message);
    }
    return true;
}


function send(client, subscribe) {
    if(client.readyState === client.OPEN) {
        client.send(subscribe);
        console.info("O " + subscribe);

    } else {
        console.warn("C " + subscribe);
    }
}

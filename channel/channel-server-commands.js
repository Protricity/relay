/**
 * Created by ari on 9/22/2015.
 */
if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.initSocketServerChannelCommands = function(SocketServer) {

    // Socket Channel Chat Commands
    SocketServer.addCommand(importChannelChatCommand);
    function importChannelChatCommand(commandString, e) {
        if (!/^(?:channel\.)?chat/i.test(commandString))
            return false;
        SocketServer.removeCommand(importChannelChatCommand);
        require('./chat/channel-server-chat-commands.js')
            .initSocketServerChannelChatCommands(SocketServer);
        return false;
    }

    // Socket Channel Suggest Commands
    SocketServer.addCommand(importChannelSuggestCommand);
    function importChannelSuggestCommand(commandString, e) {
        if (!/^(?:channel\.)?suggest/i.test(commandString))
            return false;
        SocketServer.removeCommand(importChannelSuggestCommand);
        require('./suggest/channel-server-suggest-commands.js')
            .initSocketServerChannelSuggestCommands(SocketServer);
        return false;
    }


    // Socket Channel Subscribe Commands
    SocketServer.addCommand(importChannelSubscribeCommand);
    function importChannelSubscribeCommand(commandString, e) {
        if (!/^(?:channel\.)?subscribe/i.test(commandString))
            return false;
        SocketServer.removeCommand(importChannelSubscribeCommand);
        require('./subscribe/channel-server-subscribe-commands.js')
            .initSocketServerChannelSubscribeCommands(SocketServer);
        return false;
    }

    SocketServer.addClientEventListener('close', channelClientCloseListener);

    function channelClientCloseListener() {
        var client = this;
        unloadClient(client);
    }

    function unloadClient(client) {
        if(client.readyState === client.OPEN)
            throw new Error("Client was not disconnected");
        //console.info("Socket Client Closed: ", typeof client);
        if(!client.channels) {
            console.warn("Client had no active channels");
            return;
        }

        var activeChannels = client.channels;
        delete client.channels;

        var ServerSubscriptions =
            require('../server/subscriptions/server-subscriptions.js')
                .ServerSubscriptions;

        for(var i=0; i<activeChannels[i]; i++) {
            var channel = activeChannels[i];
            var searchModes = ['chat', 'event'];
            for(var mi=0; mi<searchModes.length; mi++) {
                var mode = searchModes[mi];
                var clientList = ServerSubscriptions.getChannelSubscriptions(channel, mode);
                for(var j=0; j<clientList.length; j++) {
                    if(clientList[j][0] === client) {
                        var argString = clientList[j][1];
                        // TODO: verify this is working. console.log("TODO: unsubscribe - ", channel, mode, argString);
                        SocketServer.execute("CHANNEL.UNSUBSCRIBE." + mode.toUpperCase() + " " + channel, client);
                    }
                }
            }
        }

        return true;
    }


};


function send(client, message) {
    if(client.readyState === client.OPEN) {
        client.send(message);
        console.info("O " + message);

    } else {
        console.warn("C " + message);
    }
}

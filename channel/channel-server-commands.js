/**
 * Created by ari on 9/22/2015.
 */
if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.initSocketServerChannelCommands = function(SocketServer) {
    //SocketServer.addEventListener('connection', initClient);
    SocketServer.addCommand(messageClientCommand);
    SocketServer.addCommand(subscribeCommand);
    SocketServer.addCommand(unsubscribeCommand);
    SocketServer.addCommand(chatChannelCommand);

    SocketServer.addClientEventListener('close', channelClientCloseListener);
    //SocketServer.addEventListener('connection', channelClientOpenListener);

    //SocketServer.addCommand(leaveChannelCommand);
    //SocketServer.addCommand(nickClientCommand);
    //SocketServer.addCommand(keyListCommand);
};

var DEFAULT_MODE = 'default';

function generateUID(format) {
    return (format).replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function send(client, message) {
    client.send(message);
    console.info("O " + message);
}

function channelClientCloseListener() {
    var client = this;
    unloadClient(client);
}

function unloadClient(client) {
    if(client.readyState === client)
        return false;
    console.info("Socket Client Closed: ", typeof client);
    var ServerSubscriptions = require('channel/channel-server-subscriptions.js')
        .ServerSubscriptions;
    ServerSubscriptions.getClientSubscriptions(client,
        function(channel, mode, argString) {
            unsubscribeCommand("CHANNEL.UNSUBSCRIBE." + mode.toUpperCase() + " " + channel);
        }
    );
    return true;
}

function subscribeCommand(commandString, client) {
    var match = /^(?:channel\.)?subscribe(?:\.(\w+))?\s+(\S+)\s*([\S\s]*)$/im.exec(commandString);
    if (!match)
        return false;

    var mode = match[1] || DEFAULT_MODE;
    var channel = match[2];
    var argString = match[3];
    if(!argString)
        argString = "guest-" + generateUID('xxxx');
    //var username = argString.split(/\s+/)[0] || 'unknown';

    var ServerSubscriptions =
        require('channel/channel-server-subscriptions.js')
        .ServerSubscriptions;

    var oldArgString = ServerSubscriptions.getClientSubscription(client, channel, mode);

    var added = ServerSubscriptions.add(client, channel,  mode, argString);
    if(added) {
        var relayCommandString = "CHANNEL.SUBSCRIBE." + mode.toUpperCase() + " " + channel + " " + Date.now() + " " + argString;

        if(oldArgString) {
            var oldUserName = oldArgString.split(/\s+/)[0];
            relayCommandString = "CHANNEL.RESUBSCRIBE." + mode.toUpperCase() + " " + channel + " " + oldUserName + " " + Date.now() + " " + argString;
        }

        var clients = ServerSubscriptions.getClients(channel, mode);
        var channelClientUserList = [];
        for(var i=0; i<clients.length; i++) {
            var channelClient = clients[i][0];
            var channelClientArgString = clients[i][1];
            //var channelClientUsername = channelClientArgString.split(/\s+/)[0] || 'unknown';
            if(channelClient.readyState === channelClient.OPEN) {
                // Relay to other subscribers
                send(channelClient, relayCommandString);
                // Add to user list
                channelClientUserList.push(channelClientArgString);
            }
        }

        send(client, "USERLIST." + mode.toUpperCase() + " " + channel + "\n" + channelClientUserList.join("\n"));

    } else {
        send(client, "ERROR Subscription did not change");
    }
    return true;
}

function unsubscribeCommand(commandString, client) {
    var match = /^(?:channel\.)?unsubscribe(?:\.(\w+))?\s+(\S+)$/im.exec(commandString);
    if (!match)
        return false;

    var mode = match[1] || DEFAULT_MODE;
    var channel = match[2];

    var ServerSubscriptions =
        require('channel/channel-server-subscriptions.js')
        .ServerSubscriptions;

    var oldArgString = ServerSubscriptions.remove(client, channel, mode);
    if(oldArgString) {
        var oldUserName = oldArgString.split(/\s+/)[0];
        var relayCommandString = "CHANNEL.UNSUBSCRIBE." + mode.toUpperCase() + " " + channel + " " + Date.now() + " " + oldUserName;
        var clients = ServerSubscriptions.getClients(channel, mode);
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


function messageClientCommand(commandString, client) {
    var match = /^(?:channel\.)?message(?:\.(\w+))?\s+(\S+)\s+(\S+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        return false;

    var mode = match[1] || DEFAULT_MODE;
    var channel = match[2];
    var userID = match[3];
    var timestamp = Date.now();
    var message = match[4];

    var ServerSubscriptions =
        require('channel/channel-server-subscriptions.js')
            .ServerSubscriptions;

    var channelClients = ServerSubscriptions.getClients(channel, mode);
    for(var i=0; i<channelClients.length; i++) {
        if(channelClients[i][1].split(' ')[0] === userID) {
            send(channelClients[i][0], commandString);
            return true;
        }
    }

    send(client, "ERROR User not found: " + userID);
    return true;
}

function chatChannelCommand(commandString, client) {
    var match = /^(?:channel\.)?chat\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        return false;

    var timestamp = Date.now();
    var channel = match[1];
    var mode = "CHAT";
    var message = match[2];
    //var clientInfo = getClientInfo(client);

    var ServerSubscriptions =
        require('channel/channel-server-subscriptions.js')
            .ServerSubscriptions;

    var oldArgString = ServerSubscriptions.getClientSubscription(client, channel, mode);
    if(!oldArgString) {
        // TODO: auto subscribe? nick?
        subscribeCommand("CHANNEL.SUBSCRIBE.CHAT " + channel);
        oldArgString = ServerSubscriptions.getClientSubscription(client, channel, mode);
        if(!oldArgString)
            throw new Error("Failed to autosubscribe");
    }

    var relayCommandString = "CHANNEL.CHAT " + channel + " " + timestamp + " " + message;
    var clients = ServerSubscriptions.getClients(channel, mode);
    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i][0];
        if(channelClient.readyState === channelClient.OPEN) {
            // Inform other subscribers
            send(channelClient, relayCommandString);
        }
    }

    return true;
}
//
//
//function joinChannelCommand(commandString, client) {
//    var match = /^(?:channel\.)?join\s+(\S+)$/im.exec(commandString);
//    if(!match)
//        return false;
//
//    var channel = match[1];
//    var channelLowerCase = channel.toLowerCase();
//    //var clientInfo = getClientInfo(client);
//
//    if(typeof channelUsers[channelLowerCase] === 'undefined')
//        channelUsers[channelLowerCase] = [];
//
//    var clients = channelUsers[channelLowerCase];
//    var pos = clients.indexOf(client);
//    if(pos >= 0) {
//        send(client, "INFO Client already in channel: " + channel);
//        return true;
//    }
//
//    initClient(client);
//    clients.push(client);
//    client.chat.channels.push(channel);
//
//    var userList = [];
//    for(var i=0; i<clients.length; i++) {
//        var channelClient = clients[i];
//        if(channelClient.readyState === channelClient.OPEN) {
//            send(channelClient, "SUBSCRIBE " + channel + " " + client.chat.username + " " + Date.now());
//            userList.push(channelClient.chat.username);
//
//        } else {
//            //leaveChannelCommand("LEAVE " + channel, channelClient);
//        }
//    }
//
//    send(client, "USERLIST " + channel + " " + userList.join(" "));
//    return true;
//}
//
//
//function leaveChannelCommand(commandString, client) {
//    var match = /^leave\s+(\S+)$/im.exec(commandString);
//    if(!match)
//        return false;
//
//    var channel = match[1];
//    var channelLowerCase = channel.toLowerCase();
//    //var clientInfo = getClientInfo(client);
//
//    if(!channelUsers[channelLowerCase])
//        throw new Error("Channel does not exist: " + channelLowerCase);
//
//    var clients = channelUsers[channelLowerCase];
//    var pos = clients.indexOf(client);
//    if(pos === -1)
//        throw new Error("Client not in channel: " + channelLowerCase);
//
//    initClient(client);
//    clients.splice(pos, 1);
//    channelUsers[channelLowerCase] = clients;
//    for(var ci=0; ci<client.chat.channels.length; ci++) {
//        var userChannel = client.chat.channels[ci];
//        if(userChannel.toLowerCase() === channelLowerCase) {
//            client.chat.channels.splice(ci, 1);
//            break;
//        }
//    }
//
//    for(var i=0; i<clients.length; i++) {
//        var channelClient = clients[i];
//        if(channelClient.readyState === channelClient.OPEN) {
//            send(channelClient, "LEAVE " + channel + " " + client.chat.username + " " + Date.now());
//
//        } else {
//            //leaveChannelCommand("LEAVE " + channel, channelClient);
//        }
//    }
//
//    // Delete channel entry after last user leaves
//    if(channelUsers[channelLowerCase].length === 0)
//        delete channelUsers[channelLowerCase];
//
//    return true;
//}
//
//// KEYLIST Command
//function keyListCommand(commandString, client) {
//    var match = /^(?:channel\.)?keylist\s*(\S*)$/im.exec(commandString);
//    if(!match)
//        return false;
//    var filterChannel = match[1].toLowerCase();
//
//    initClient(client);
//
//    var keyspaces = [];
//    for(var i=0; i<client.chat.channels.length; i++) {
//        var channel = client.chat.channels[i];
//        var channelLowerCase = channel.toLowerCase();
//        if(filterChannel && channelLowerCase.indexOf(filterChannel) !== 0)
//            continue;
//        if(typeof channelUsers[channelLowerCase] === 'object') {
//            for(var j=0; j<channelUsers[channelLowerCase].length; j++) {
//                var channelClient = channelUsers[channelLowerCase][j];
//                if(channelClient.readyState === channelClient.OPEN
//                    && typeof channelClient.keyspace !== 'undefined') {
//                    for(var k=0; k<channelClient.keyspace; k++) {
//                        if(keyspaces.indexOf(channelClient.keyspace[k]) === -1) {
//                            keyspaces.push(channelClient.keyspace[k]);
//                        }
//                    }
//                }
//            }
//        }
//    }
//
//    send(client, "CHANNEL.KEYLIST " + filterChannel +
//        (keyspaces.length === 0 ? '' : "\n" + keyspaces.join("\n"))
//    );
//
//    return true;
//}


//// TODO: refactor
//function nickClientCommand(commandString, client) {
//    var match = /^(?:channel\.)?nick\s+([a-z0-9_-]{2,64})$/im.exec(commandString);
//    if(!match)
//        return false;
//
//    //var clientInfo = getClientInfo(client);
//    var newNick = match[1];
//    var oldNick = client.chat.username;
//    var now = Date.now();
//
//    var targetClient = clientUserNames[newNick.toLowerCase()];
//    if(typeof targetClient !== 'undefined' && targetClient.readyState === targetClient.OPEN)
//        throw new Error("Nick already exists. Please choose another.");
//
//    initClient(client);
//    client.chat.username = newNick;
//    delete clientUserNames[oldNick.toLowerCase()];
//    clientUserNames[newNick.toLowerCase()] = client;
//
//    var nickedClients = [];
//    for(var i=0; i<client.chat.channels.length; i++) {
//        var channel = client.chat.channels[i];
//        var channelLowerCase = channel.toLowerCase();
//        if(typeof channelUsers[channelLowerCase] === 'object') {
//            for(var j=0; j<channelUsers[channelLowerCase].length; j++) {
//                var channelClient = channelUsers[channelLowerCase][j];
//                if(channelClient.readyState === channelClient.OPEN) {
//                    if(nickedClients.indexOf(channelClient) === -1) {
//                        nickedClients.push(channelClient);
//                        send(channelClient, "NICK " + oldNick + " " + newNick + " " + now);
//                    }
//                }
//            }
//        }
//    }
//
//    if(nickedClients.indexOf(client) === -1) {
//        nickedClients.push(client);
//        send(client, "NICK " + oldNick + " " + newNick + " " + now);
//    }
//
//    return true;
//}

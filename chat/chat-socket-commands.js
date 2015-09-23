/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initSocketServerCommands = function(SocketServer) {
    SocketServer.addCommand('message', messageClient);
    SocketServer.addCommand('join', joinChannel);
    SocketServer.addCommand('leave', leaveChannel);
    SocketServer.addCommand('chat', chatChannel);
    SocketServer.addCommand('nick', nickClient);
};

//var activeClients = [];

var DEFAULT_UID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
function isClientActive(client) {
    if(typeof client.chat === 'undefined') {
        client.chat = {};
        client.chat.uid = DEFAULT_UID.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
        client.pgp = {};
        client.pgp.id_public = '_';

        client.chat.username = "guest-" + client.chat.uid.substring(client.chat.uid.length() - 4);
        client.chat.channels = [];
        clientUIDs[client.chat.uid] = client;
        //activeClients.push(client);
    }

    if(client.readyState !== WebSocket.OPEN) {
        for(var i=0; i<client.chat.channels.length; i++) {
            var channel = client.chat.channels[i];
            leaveChannel(client, channel);
        }
        //for(var i=0; i<activeClients.length; i++) {
        //}
        return false;
    }

    return true;
}

var channelUsers = {};
var clientUIDs = {};

function chatChannel(client, commandString) {
    var match = /^chat\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Chat Command: " + commandString);
    var channel = match[1];
    var timestamp = parseInt(match[2]);
    var message = match[3];

    if(typeof channelUsers[channel] === 'undefined')
        channelUsers[channel] = [];

    var clients = channelUsers[channel];
    var pos = clients.indexOf(client);
    if(pos === -1)
        joinChannel(client, "JOIN " + channel);

    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(isClientActive(channelClient)) {
            channelClient.send("CHAT " + channel + " " + timestamp + " " + client.uid + " " + client.chat.username + " " + message);
        }
    }

}


function joinChannel(client, commandString) {
    var match = /^join\s+(\S+)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Chat Command: " + commandString);
    var channel = match[1];

    if(typeof channelUsers[channel] === 'undefined')
        channelUsers[channel] = [];

    var clients = channelUsers[channel];
    var pos = clients.indexOf(client);
    if(pos >= 0)
        throw new Error("Client already in channel: " + channel);
    clients.push(client);

    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(isClientActive(channelClient)) {
            channelClient.send("JOIN " + channel + " " + client.pgp.id_public + " " + client.uid + " " + client.chat.username + " " + Date.now());
        }
    }
}


function leaveChannel(client, commandString) {
    var match = /^leave\s+(\S+)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Chat Command: " + commandString);
    var channel = match[1];

    if(typeof channelUsers[channel] !== 'undefined')
        throw new Error("Channel does not exist: " + channel);
    var clients = channelUsers[channel];
    var pos = clients.indexOf(client);
    if(pos === -1)
        throw new Error("Client not in channel: " + channel);

    clients.splice(pos, 1);
    channelUsers = client;

    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(isClientActive(channelClient)) {
            channelClient.send("LEAVE " + channel + " " + client.pgp.id_public + " " + client.uid + " " + client.chat.username + " " + Date.now());
        }
    }
}
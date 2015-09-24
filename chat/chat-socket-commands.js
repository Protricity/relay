/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initSocketCommands = function(SocketServer) {
    SocketServer.addEventListener('connection', onSocketClient);
    SocketServer.addCommand('message', messageClient);
    SocketServer.addCommand('join', joinChannel);
    SocketServer.addCommand('leave', leaveChannel);
    SocketServer.addCommand('chat', chatChannel);
    SocketServer.addCommand('nick', nickClient);
};

function onSocketClient(newClient) {
    if(newClient.chat)
        throw new Error("Chat Client already initiated: " + newClient.chat.username);

    var uid = generateUID('xxxx');
    newClient.chat = {};
    newClient.chat.username = "guest-" + uid.substring(uid.length - 4);
    newClient.chat.channels = [];
    //console.log("Initiated new Chat Client: " + newClient);
    //clientUIDs[newClient.chat.uid] = newClient;
    //activeClients.push(client);
    //send(newClient.chat, "INFO Initiated " + newClient.chat.uid);
}

//var activeClients = [];

function generateUID(format) {
    return (format).replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function isClientActive(client) {
    if(typeof client.chat === 'undefined') {
    }

    if(client.readyState !== 1) {
        console.info("Client is inactive: " + client.chat.uid);
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
//var clientUIDs = {};

function send(client, message) {
    client.send(message);
    console.info("O " + message);
}

function nickClient(commandString, client) {
    var match = /^nick\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Chat Command: " + commandString);
    //var userID = match[1];
    //var timestamp = parseInt(match[2]);
    //var message = match[3];

    console.log("Message ", commandString);
}

function messageClient(commandString, client) {
    var match = /^message\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Chat Command: " + commandString);
    var userID = match[1];
    var timestamp = parseInt(match[2]);
    var message = match[3];

    console.log("Message ", userID, timestamp, message);
}

function chatChannel(commandString, client) {
    var match = /^chat\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Chat Command: " + commandString);
    var channel = match[1].toLowerCase();
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
            send(channelClient, "CHAT " + channel + " " + timestamp + " " + client.chat.uid + " " + client.chat.username + " " + message);
        }
    }

}


function joinChannel(commandString, client) {
    var match = /^join\s+(\S+)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Chat Command: " + commandString);
    var channel = match[1].toLowerCase();

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
            send(channelClient, "JOIN " + channel + " " + ((client.pgp || {}).uid||'_') + " " + client.chat.username + " " + Date.now());
        }
    }
}


function leaveChannel(commandString, client) {
    var match = /^leave\s+(\S+)$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid Chat Command: " + commandString);
    var channel = match[1].toLowerCase();

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
            send(channelClient, "LEAVE " + channel + " " + client.pgp.id_public + " " + client.chat.uid + " " + client.chat.username + " " + Date.now());
        }
    }
}
/**
 * Created by ari on 9/22/2015.
 */
if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.initSocketServerChannelCommands = function(SocketServer) {
    //SocketServer.addEventListener('connection', initClient);
    SocketServer.addCommand(messageClient);
    SocketServer.addCommand(joinChannel);
    SocketServer.addCommand(leaveChannel);
    SocketServer.addCommand(chatChannel);
    SocketServer.addCommand(nickClient);
};

var clientUserNames = {};
function getClientInfo(client) {
    if(client.chat)
        return client.chat;

    var uid = generateUID('xxxx');
    client.chat = {};
    client.chat.username = "guest-" + uid.substring(uid.length - 4);
    clientUserNames[client.chat.username] = client;
    client.chat.channels = [];
    return client.chat;
}


//var activeClients = [];

function generateUID(format) {
    return (format).replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function isClientActive(client) {
    if(client.readyState !== client.OPEN) {
        var clientInfo = getClientInfo(client);
        //console.info("Client is inactive: " + clientInfo.username);
        for(var i=0; i<clientInfo.channels.length; i++) {
            var channel = clientInfo.channels[i];
            //leaveChannel("LEAVE " + channel, client);
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
    var match = /^nick\s+([a-z0-9_-]{2,64})$/im.exec(commandString);
    if(!match)
        return false;

    var clientInfo = getClientInfo(client);
    var newNick = match[1];
    var oldNick = clientInfo.username;
    var now = Date.now();

    var targetClient = clientUserNames[newNick.toLowerCase()];
    if(typeof targetClient !== 'undefined' && isClientActive(targetClient))
        throw new Error("Nick already exists. Please choose another.");

    clientInfo.username = newNick;
    delete clientUserNames[oldNick.toLowerCase()];
    clientUserNames[newNick.toLowerCase()] = client;

    var nickedClients = [];
    for(var i=0; i<clientInfo.channels.length; i++) {
        var channel = clientInfo.channels[i];
        var channelLowerCase = channel.toLowerCase();
        if(typeof channelUsers[channelLowerCase] === 'object') {
            for(var j=0; j<channelUsers[channelLowerCase].length; j++) {
                var channelClient = channelUsers[channelLowerCase][j];
                if(isClientActive(channelClient)) {
                    if(nickedClients.indexOf(channelClient) === -1) {
                        nickedClients.push(channelClient);
                        send(channelClient, "NICK " + oldNick + " " + newNick + " " + now);
                    }
                }
            }
        }
    }

    if(nickedClients.indexOf(client) === -1) {
        nickedClients.push(client);
        send(client, "NICK " + oldNick + " " + newNick + " " + now);
    }

    return true;
}

function messageClient(commandString, client) {
    var match = /^message\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        return false;

    var userID = match[1];
    var timestamp = parseInt(match[2]);
    var message = match[3];

    if(typeof clientUserNames[userID.toLowerCase()] !== 'object')
        throw new Error("User not found: " + userID);

    var targetClient = clientUserNames[userID.toLowerCase()];
    send(targetClient, commandString);

    return true;
}

function chatChannel(commandString, client) {
    var match = /^chat\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        return false;

    var channel = match[1];
    var channelLowerCase = channel.toLowerCase();
    var timestamp = parseInt(match[2]);
    var message = match[3];
    var clientInfo = getClientInfo(client);

    if(typeof channelUsers[channelLowerCase] === 'undefined')
        throw new Error("Channel does not exist: " + channelLowerCase);
        //joinChannel("JOIN " + channel, client);

    var clients = channelUsers[channelLowerCase];
    var pos = clients.indexOf(client);
    if(pos === -1)
        joinChannel(client, "JOIN " + channel);

    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(isClientActive(channelClient)) {
            send(channelClient, "CHAT " + channel + " " + clientInfo.username + " " + timestamp + " " + message);

        } else {
            //leaveChannel("LEAVE " + channel, channelClient);
        }
    }
    return true;
}


function joinChannel(commandString, client) {
    var match = /^join\s+(\S+)$/im.exec(commandString);
    if(!match)
        return false;

    var channel = match[1];
    var channelLowerCase = channel.toLowerCase();
    var clientInfo = getClientInfo(client);

    if(typeof channelUsers[channelLowerCase] === 'undefined')
        channelUsers[channelLowerCase] = [];

    var clients = channelUsers[channelLowerCase];
    var pos = clients.indexOf(client);
    if(pos >= 0) {
        send(client, "INFO Client already in channel: " + channel);
        return true;
    }

    clients.push(client);
    clientInfo.channels.push(channel);

    var userList = [];
    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(isClientActive(channelClient)) {
            send(channelClient, "JOIN " + channel + " " + clientInfo.username + " " + Date.now());
            userList.push(clientInfo.username);

        } else {
            //leaveChannel("LEAVE " + channel, channelClient);
        }
    }

    send(client, "USERLIST " + channel + " " + userList.join(" "));
    return true;
}


function leaveChannel(commandString, client) {
    var match = /^leave\s+(\S+)$/im.exec(commandString);
    if(!match)
        return false;

    var channel = match[1];
    var channelLowerCase = channel.toLowerCase();
    var clientInfo = getClientInfo(client);

    if(!channelUsers[channelLowerCase])
        throw new Error("Channel does not exist: " + channelLowerCase);

    var clients = channelUsers[channelLowerCase];
    var pos = clients.indexOf(client);
    if(pos === -1)
        throw new Error("Client not in channel: " + channelLowerCase);

    clients.splice(pos, 1);
    channelUsers[channelLowerCase] = clients;
    for(var ci=0; ci<clientInfo.channels.length; ci++) {
        var userChannel = clientInfo.channels[ci];
        if(userChannel.toLowerCase() === channelLowerCase) {
            clientInfo.channels.splice(ci, 1);
            break;
        }
    }

    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(isClientActive(channelClient)) {
            send(channelClient, "LEAVE " + channel + " " + clientInfo.username + " " + Date.now());

        } else {
            //leaveChannel("LEAVE " + channel, channelClient);
        }
    }

    // Delete channel entry after last user leaves
    if(channelUsers[channelLowerCase].length === 0)
        delete channelUsers[channelLowerCase];

    return true;
}
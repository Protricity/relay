/**
 * Created by ari on 9/22/2015.
 */
if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.initSocketServerChannelCommands = function(SocketServer) {
    //SocketServer.addEventListener('connection', initClient);
    SocketServer.addCommand(messageClientCommand);
    SocketServer.addCommand(joinChannelCommand);
    SocketServer.addCommand(leaveChannelCommand);
    SocketServer.addCommand(chatChannelCommand);
    SocketServer.addCommand(nickClientCommand);
    SocketServer.addCommand(keyListCommand);

    SocketServer.addEventListener('connection', channelClientOpenListener);
    SocketServer.addClientEventListener('close', channelClientCloseListener);
};


//var activeClients = [];

var clientUserNames = {};
var channelUsers = {};
//var clientUIDs = {};

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

function initClient(client) {
    if(typeof client.chat !== 'undefined')
        return;

    var uid = generateUID('xxxx');
    client.chat = {
        username: "guest-" + uid.substring(uid.length - 4),
        channels: []
    };
    clientUserNames[client.chat.username] = client;
}

function uninitClient(client) {
    if(typeof client.chat === 'undefined')
        return;

    if(typeof client.chat.channels !== 'undefined') {
        var channels = client.chat.channels.slice();
        for(var i=0; i<channels.length; i++) {
            var channel = channels[i];
            leaveChannelCommand("LEAVE " + channel, client);
        }
    }

    delete client.chat;
}


function channelClientOpenListener(client) {
    //console.info("Client Opened: ", typeof client);

    initClient(client);
}

// TODO: not working
function channelClientCloseListener() {
    var client = this;
    console.info("Channel Client Closed: ", typeof client);
    uninitClient(client);
}

function nickClientCommand(commandString, client) {
    var match = /^nick\s+([a-z0-9_-]{2,64})$/im.exec(commandString);
    if(!match)
        return false;

    //var clientInfo = getClientInfo(client);
    var newNick = match[1];
    var oldNick = client.chat.username;
    var now = Date.now();

    var targetClient = clientUserNames[newNick.toLowerCase()];
    if(typeof targetClient !== 'undefined' && targetClient.readyState === targetClient.OPEN)
        throw new Error("Nick already exists. Please choose another.");

    initClient(client);
    client.chat.username = newNick;
    delete clientUserNames[oldNick.toLowerCase()];
    clientUserNames[newNick.toLowerCase()] = client;

    var nickedClients = [];
    for(var i=0; i<client.chat.channels.length; i++) {
        var channel = client.chat.channels[i];
        var channelLowerCase = channel.toLowerCase();
        if(typeof channelUsers[channelLowerCase] === 'object') {
            for(var j=0; j<channelUsers[channelLowerCase].length; j++) {
                var channelClient = channelUsers[channelLowerCase][j];
                if(channelClient.readyState === channelClient.OPEN) {
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

function messageClientCommand(commandString, client) {
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

function chatChannelCommand(commandString, client) {
    var match = /^chat\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(commandString);
    if(!match)
        return false;

    var channel = match[1];
    var channelLowerCase = channel.toLowerCase();
    var timestamp = parseInt(match[2]);
    var message = match[3];
    //var clientInfo = getClientInfo(client);

    if(typeof channelUsers[channelLowerCase] === 'undefined')
        throw new Error("Channel does not exist: " + channelLowerCase);
        //joinChannelCommand("JOIN " + channel, client);

    initClient(client);

    var clients = channelUsers[channelLowerCase];
    var pos = clients.indexOf(client);
    if(pos === -1)
        joinChannelCommand(client, "JOIN " + channel);

    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(channelClient.readyState === channelClient.OPEN) {
            send(channelClient, "CHAT " + channel + " " + client.chat.username + " " + timestamp + " " + message);

        } else {
            //leaveChannelCommand("LEAVE " + channel, channelClient);
        }
    }
    return true;
}


function joinChannelCommand(commandString, client) {
    var match = /^join\s+(\S+)$/im.exec(commandString);
    if(!match)
        return false;

    var channel = match[1];
    var channelLowerCase = channel.toLowerCase();
    //var clientInfo = getClientInfo(client);

    if(typeof channelUsers[channelLowerCase] === 'undefined')
        channelUsers[channelLowerCase] = [];

    var clients = channelUsers[channelLowerCase];
    var pos = clients.indexOf(client);
    if(pos >= 0) {
        send(client, "INFO Client already in channel: " + channel);
        return true;
    }

    initClient(client);
    clients.push(client);
    client.chat.channels.push(channel);

    var userList = [];
    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(channelClient.readyState === channelClient.OPEN) {
            send(channelClient, "JOIN " + channel + " " + client.chat.username + " " + Date.now());
            userList.push(channelClient.chat.username);

        } else {
            //leaveChannelCommand("LEAVE " + channel, channelClient);
        }
    }

    send(client, "USERLIST " + channel + " " + userList.join(" "));
    return true;
}


function leaveChannelCommand(commandString, client) {
    var match = /^leave\s+(\S+)$/im.exec(commandString);
    if(!match)
        return false;

    var channel = match[1];
    var channelLowerCase = channel.toLowerCase();
    //var clientInfo = getClientInfo(client);

    if(!channelUsers[channelLowerCase])
        throw new Error("Channel does not exist: " + channelLowerCase);

    var clients = channelUsers[channelLowerCase];
    var pos = clients.indexOf(client);
    if(pos === -1)
        throw new Error("Client not in channel: " + channelLowerCase);

    initClient(client);
    clients.splice(pos, 1);
    channelUsers[channelLowerCase] = clients;
    for(var ci=0; ci<client.chat.channels.length; ci++) {
        var userChannel = client.chat.channels[ci];
        if(userChannel.toLowerCase() === channelLowerCase) {
            client.chat.channels.splice(ci, 1);
            break;
        }
    }

    for(var i=0; i<clients.length; i++) {
        var channelClient = clients[i];
        if(channelClient.readyState === channelClient.OPEN) {
            send(channelClient, "LEAVE " + channel + " " + client.chat.username + " " + Date.now());

        } else {
            //leaveChannelCommand("LEAVE " + channel, channelClient);
        }
    }

    // Delete channel entry after last user leaves
    if(channelUsers[channelLowerCase].length === 0)
        delete channelUsers[channelLowerCase];

    return true;
}

// KEYLIST Command
function keyListCommand(commandString, client) {
    var match = /^(?:channel\.)?keylist\s*(\S*)$/im.exec(commandString);
    if(!match)
        return false;
    var filterChannel = match[1].toLowerCase();

    initClient(client);

    var keyspaces = [];
    for(var i=0; i<client.chat.channels.length; i++) {
        var channel = client.chat.channels[i];
        var channelLowerCase = channel.toLowerCase();
        if(filterChannel && channelLowerCase.indexOf(filterChannel) !== 0)
            continue;
        if(typeof channelUsers[channelLowerCase] === 'object') {
            for(var j=0; j<channelUsers[channelLowerCase].length; j++) {
                var channelClient = channelUsers[channelLowerCase][j];
                if(channelClient.readyState === channelClient.OPEN
                    && typeof channelClient.keyspace !== 'undefined') {
                    for(var k=0; k<channelClient.keyspace; k++) {
                        if(keyspaces.indexOf(channelClient.keyspace[k]) === -1) {
                            keyspaces.push(channelClient.keyspace[k]);
                        }
                    }
                }
            }
        }
    }

    send(client, "CHANNEL.KEYLIST " + filterChannel +
        (keyspaces.length === 0 ? '' : "\n" + keyspaces.join("\n"))
    );

    return true;
}
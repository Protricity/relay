/**
 * Created by ari on 6/19/2015.
 */

var SOCKET_RECONNECT_INTERVAL = 5000;

importScripts('defaults.js');



onmessage = function (e) {
    executeCommand(e.data);
};

var activeSockets = [];


function onSocketMessage(e) {
    console.log("SOCKET IN: ", e.data);
    executeResponse(e.data);
}

function getSocket(socketURL) {
    for(var j=0; j<activeSockets.length; j++)
        if (activeSockets[j].url === socketURL)
            return activeSockets[j];

    var newSocket = new WebSocket(socketURL);
    function onOpen(e) {
        if(newSocket.readyState != WebSocket.OPEN)
            return;
        newSocket.removeEventListener('open', onOpen);
        self.postMessage("SOCKET OPEN " + socketURL);

        newSocket.send("IDENTIFY " + publicKey);
//         newSocket.send("JOIN *");
        //newSocket.send("MSG test test message");
    }
    function onClose(e) {
        console.log("SOCKET CLOSED: ", e.currentTarget, e.reason, e);
        self.postMessage("SOCKET CLOSED " + socketURL);

        newSocket.removeEventListener('close', onClose);
        for(var j=0; j<activeSockets.length; j++)
            if (activeSockets[j].url === socketURL) 
                activeSockets.splice(j, 1);

        setTimeout(function() {
            console.info("Reconnecting to: " + socketURL);
            getSocket(socketURL);
        }, SOCKET_RECONNECT_INTERVAL);
    }
    newSocket.addEventListener('message', onSocketMessage);
    newSocket.addEventListener('open', onOpen);
    newSocket.addEventListener('close', onClose);
    activeSockets.push(newSocket);
    return newSocket;
}

function selectFastestSocket(onSelected, socketList) {
    if(typeof socketList === 'undefined')
        socketList = defaultSocketList.slice();

    var i, socket;
    var sockets = [];
    for(i=0; i<socketList.length; i++) {
        socket = getSocket(socketList[i]);
        sockets.push(socket);
        if(socket.readyState === WebSocket.OPEN) {
            onSelected(socket);
            return;
        }
    }
    var selected = false;
    function onOpen(e) {
        this.removeEventListener('open', onOpen);
        if(!selected) {
            selected = true;
            onSelected(this);
        }
    }
    for(i=0; i<sockets.length; i++) {
        socket = sockets[i];
        socket.addEventListener('open', onOpen);
    }
}


function sendWithFastestSocket(commandString) {
    var args = commandString.split(/\s+/);
    if(args.length <= 1 || !args[1])
        throw new Error("Invalid path");

    var path = args[1].toLowerCase();
    var socketList = defaultSocketList;
    if(typeof socketListByPath[path.toLowerCase()] === 'object')
        socketList = socketListByPath[path.toLowerCase()];

    selectFastestSocket(function(selectedSocket) {
        console.log("SOCKET OUT (" + selectedSocket.url + "): " + commandString);
        selectedSocket.send(commandString);
    }, socketList);
}


function routeResponseToClient(commandResponse) {
    self.postMessage(commandResponse);
}

function executeCommand(commandString, e) {
    var args = commandString.split(/\s+/, 1);
    var cmd = args[0].toLowerCase();
    var functionName = cmd+'Command';
    if(typeof self[functionName] !== 'function')
        throw new Error("Command failed to load: " + cmd);
    return self[functionName](commandString, e);
}


function executeResponse(commandResponse, e) {
    var args = commandResponse.split(/\s+/, 1);
    var cmd = args[0].toLowerCase();
    var functionName = cmd+'Response';
    if(typeof self[functionName] !== 'function')
        throw new Error("Command Response failed to load: " + cmd);
    return self[functionName](commandResponse, e);
}

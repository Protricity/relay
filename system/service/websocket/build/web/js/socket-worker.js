/**
 * Created by ari on 6/19/2015.
 */

importScripts('defaults.js');



onmessage = function (e) {
    var args = e.data.split(/\s+/);
    var cmd = args[0].toLowerCase();
    var functionName = cmd+'Command';
    if(typeof self[functionName] !== 'function') {
        console.log("Loading Command: " + cmd);
        importScripts('commands/' + cmd + '.command.js');
        if(typeof self[functionName] !== 'function')
            throw new Error("Command failed to load: " + cmd);
    }
    self[functionName](e.data);
};

var activeSockets = [];

function getSocket(socketURL) {
    for(var j=0; j<activeSockets.length; j++) {
        var activeSocket = activeSockets[j];
        if (activeSocket.url === socketURL) {
            return activeSocket;
        }
    }
    var newSocket = new WebSocket(socketURL);
    function onOpen(e) {
        if(newSocket.readyState != WebSocket.OPEN)
            return;
        newSocket.removeEventListener('open', onOpen);
        newSocket.send("IDENTIFY " + publicKey);
    }
    newSocket.addEventListener('open', onOpen);
    activeSockets.push(newSocket);
    return newSocket;
}

function selectFastestSocket(onSelected, socketList) {
    if(typeof socketList === 'undefined')
        socketList = socketList.slice();

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

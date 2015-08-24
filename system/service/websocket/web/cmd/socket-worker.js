/**
 * Created by ari on 6/19/2015.
 */

(function() {
    var SOCKET_RECONNECT_INTERVAL = 5000;

    importScripts('socket-defaults.js');

    self.addEventListener('message', function (e) {
        self.executeWorkerCommand(e.data, e);
    });

    var activeSockets = [];

    var onNewSocketOpenCallbacks = [];
    self.addNewSocketHandler = function(onNewSocketOpen) {
        if(onNewSocketOpenCallbacks.indexOf(onNewSocketOpen) === -1)
            onNewSocketOpenCallbacks.push(onNewSocketOpen);
    };

    self.getSocket = function(socketURL) {
        for(var j=0; j<activeSockets.length; j++)
            if (activeSockets[j].url === socketURL)
                return activeSockets[j];

        var newSocket = new WebSocket(socketURL);
        function onOpen(e) {
            if(newSocket.readyState != WebSocket.OPEN)
                return;
            newSocket.removeEventListener('open', onOpen);
            self.postMessage("SOCKET OPEN " + socketURL);

            for(var i=0; i<onNewSocketOpenCallbacks.length; i++)
                onNewSocketOpenCallbacks[i](newSocket);
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
                self.getSocket(socketURL);
            }, SOCKET_RECONNECT_INTERVAL);
        }
        function onSocketMessage(e) {
            console.log("SOCKET IN: ", e.data);
            self.executeWorkerResponse(e.data, e);
        }

        newSocket.addEventListener('message', onSocketMessage);
        newSocket.addEventListener('open', onOpen);
        newSocket.addEventListener('close', onClose);
        activeSockets.push(newSocket);
        return newSocket;
    };

    self.selectFastestSocket = function(onSelected, socketList) {
        if(typeof socketList === 'undefined')
            socketList = self.defaultSocketList.slice();

        var i, socket;
        var sockets = [];
        for(i=0; i<socketList.length; i++) {
            socket = self.getSocket(socketList[i]);
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
    };


    self.sendWithFastestSocket = function(commandString, commandPath) {
        var socketList = self.defaultSocketList;
        if(commandPath) {
            for(var i=0; i<self.socketListByPath.length; i++) {
                var test = self.socketListByPath[i][0];
                if((typeof test === 'object')
                        ? test.test(commandPath)
                        : commandPath.substr(0, test.length).toLowerCase() === test.toLowerCase()) {
                    socketList = socketListByPath[i][1];
                    break;
                }
            }
        }

        self.selectFastestSocket(function(selectedSocket) {
            console.log("SOCKET OUT (" + selectedSocket.url + "): " + commandString);
            selectedSocket.send(commandString);
        }, socketList);
    };


    self.routeResponseToClient = function(commandResponse) {
        self.postMessage(commandResponse);
    };

    self.executeWorkerCommand = function(commandString, e) {
        var message = commandString;
        if(typeof message === 'object')
            message = message.message;
        var cmd = message.split(/\s+/, 1)[0].toLowerCase();
        var functionName = cmd+'Command';
        if(typeof self[functionName] !== 'function')
            throw new Error("Command failed to load: " + cmd);
        return self[functionName](commandString, e);
    };


    self.executeWorkerResponse = function(commandResponse, e) {
        var cmd = commandResponse.split(/\s+/, 1)[0].toLowerCase();
        var functionName = cmd+'Response';
        if(typeof self[functionName] !== 'function')
            throw new Error("Command Response failed to load: " + cmd);
        return self[functionName](commandResponse, e);
    };

})();

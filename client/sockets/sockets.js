/**
 * Created by ari on 6/19/2015.
 */


Sockets.NEXT_SOCKET_INTERVAL = 5000;
Sockets.SOCKET_RECONNECT_INTERVAL = 5000;

function Sockets(socketURL) {
    return Sockets.get(socketURL);
}

(function() {

    var activeSockets = [];
    var socketURLList = [];

    Sockets.addURL = function(socketURL) {
        socketURLList.push(socketURL);
    };

    importScripts('socket/socket-defaults.js');
    importScripts('socket/socket-templates.js');

    Sockets.getAll = function() { return activeSockets; };

    Sockets.get = function(socketURL) {
        if(!socketURL)
            throw new Error("Invalid socket url");

        for(var j=0; j<activeSockets.length; j++)
            if (activeSockets[j].url === socketURL)
                return activeSockets[j];

        var newSocket = new WebSocket(socketURL);
        activeSockets.push(newSocket);
        function onOpen(e) {
            if(newSocket.readyState != WebSocket.OPEN)
                return;
            newSocket.removeEventListener('open', onOpen);
            //self.postMessage("SOCKET OPEN " + socketURL);

            for(var i=0; i<Sockets.listeners.length; i++)
                if(Sockets.listeners[i][0] === 'open')
                    Sockets.listeners[i][1](newSocket);

            templateSocketActionEntry("SOCKET OPEN: " + newSocket.url, function(html) {
                CommandResponses.postToClient('LOG socket-log:' + newSocket.url + ' ' + html);
            });
        }
        function onClose(e) {

            console.log("SOCKET CLOSED: ", e.currentTarget, e.reason, e);
            //self.postMessage("SOCKET CLOSED " + socketURL);

            newSocket.removeEventListener('close', onClose);
            var socketCount = 0;
            for(var j=0; j<activeSockets.length; j++) {
                socketCount += newSocket.readyState === WebSocket.OPEN ? 1 : 0;
                if (activeSockets[j].url === socketURL)
                    activeSockets.splice(j, 1);
            }

            if(socketCount === 0) {
                setTimeout(function () {
                    console.info("Reconnecting to: " + socketURL);
                    Sockets.get(socketURL);
                }, Sockets.SOCKET_RECONNECT_INTERVAL);
            }

            templateSocketActionEntry("SOCKET CLOSED: " + newSocket.url, function(html) {
                CommandResponses.postToClient('LOG socket-log:' + newSocket.url + ' ' + html);
            });

        }
        function onSocketMessage(e) {
            CommandResponses.process(e.data, e);
            var socket = e.target;
            if(socket instanceof WebSocket) {
                templateSocketLogEntry(e.data, 'I', function(html) {
                    CommandResponses.postToClient('LOG socket-log:' + socket.url + ' ' + html);
                });
            }
        }

        newSocket.addEventListener('message', onSocketMessage);
        newSocket.addEventListener('open', onOpen);
        newSocket.addEventListener('close', onClose);

        newSocket.addEventListener('message', Sockets.callEventListeners);
        newSocket.addEventListener('open', Sockets.callEventListeners);
        newSocket.addEventListener('close', Sockets.callEventListeners);

        templateSocketLog(newSocket.url, function(html) {
            CommandResponses.postToClient('LOG.REPLACE socket:' + newSocket.url + ' ' + html);
        });

        return newSocket;
    };



    var listeners = [];
    Sockets.callEventListeners = function(e) {
        for(var i=0; i<listeners.length; i++)
            if(listeners[i][0] === e.type)
                listeners[i][1](e);
    };
    Sockets.addEventListener = function(type, listener) {
        Sockets.removeEventListener(listener);
        listeners.push([type, listener]);
    };
    Sockets.removeEventListener = function(listener) {
        for(var i=0; i<listeners.length; i++) {
            var entry = listeners[i];
            if(entry[1] === listener) {
                Array.prototype.splice(i, 1);
                return true;
            }
        }
        return false;
    };

    var nextSocketInterval = null;
    Sockets.getFastestAsync = function(onSelected, socketList) {
        if(typeof socketList === 'undefined')
            socketList = socketURLList.slice();

        var i=0;
        var openSocket = false;
        nextSocketInterval = setInterval(nextSocket, Sockets.NEXT_SOCKET_INTERVAL);
        nextSocket();

        function nextSocket() {
            if(openSocket) {
                clearInterval(nextSocketInterval);
                return;
            }

            if(socketList.length <= i)
                throw new Error("No more sockets");
            var socket = Sockets.get(socketList[i++]);
            if(socket.readyState === WebSocket.OPEN) {
                openSocket = socket;
                onSelected(socket);
                return;
            }

            socket.addEventListener('open', onOpen);
            function onOpen(e) {
                socket.removeEventListener('open', onOpen);
                if(!openSocket) {
                    openSocket = socket;
                    onSelected(socket);
                }
            }
        }

    };



    Sockets.send = function(commandString, withSocket) {
        function send(socket){
            templateSocketLogEntry(commandString, 'O', function(html) {
                CommandResponses.postToClient('LOG socket-log:' + socket.url + ' ' + html);
            });
            socket.send(commandString);
        }
        if(withSocket) {
            send(withSocket);

        } else {
            Sockets.getFastestAsync(function(selectedSocket) {
                send(selectedSocket);
            });
        }

       //if(commandPath) {
        //    for(var i=0; i<socketListByPath.length; i++) {
        //        var test = socketListByPath[i][0];
        //        if((typeof test === 'object')
        //                ? test.test(commandPath)
        //                : commandPath.substr(0, test.length).toLowerCase() === test.toLowerCase()) {
        //            socketList = socketListByPath[i][1];
        //            break;
        //        }
        //    }
        //}
    };

})();

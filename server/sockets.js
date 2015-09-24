/**
 * Created by ari on 6/19/2015.
 */

Sockets.NEXT_SOCKET_INTERVAL = 5000;
Sockets.SOCKET_RECONNECT_INTERVAL = 5000;

function Sockets(socketURL) {
    return Sockets.get(socketURL);
}

(function() {

    var eventListeners = [];
    var activeSockets = [];
    var socketURLList = [];
    var reconnectTimeout = null;

    Sockets.addURL = function(socketURL) {
        socketURLList.push(socketURL);
    };

    importScripts('server/sockets-defaults.js');
    importScripts('socket/templates/sockets-log-template.js');

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

            for(var i=0; i<eventListeners.length; i++)
                if(eventListeners[i][0] === 'open')
                    eventListeners[i][1](newSocket);

            Templates.socket.log.action("SOCKET OPEN: " + newSocket.url, function(html) {
                Client.postResponseToClient('LOG socket-log:' + newSocket.url + ' ' + html);
            });

            newSocket.send("PGP-AUTH ABCD1234 ABCD6543");
        }
        function onClose(e) {
            console.log("SOCKET CLOSED: ", e.currentTarget, e.reason, e);
            //self.postMessage("SOCKET CLOSED " + socketURL);

            newSocket.removeEventListener('close', onClose);
            for(var j=0; j<activeSockets.length; j++) {
                if (activeSockets[j] === newSocket) {
                    activeSockets.splice(j, 1);
                    console.log("Removing Socket: "+ j, newSocket, activeSockets);
                    break;
                }
            }

            if(reconnectTimeout)
                clearTimeout(reconnectTimeout);

            reconnectTimeout = setTimeout(function () {
                for(var i=0; i<activeSockets.length; i++)
                    if(activeSockets[i].readyState === WebSocket.OPEN)
                        return;

                console.info("No active sockets found. Reconnecting to: " + socketURL);
                Sockets.get(socketURL);
            }, Sockets.SOCKET_RECONNECT_INTERVAL);

            Templates.socket.log.action("SOCKET CLOSED: " + newSocket.url, function(html) {
                Client.postResponseToClient('LOG socket-log:' + newSocket.url + ' ' + html);
            });

        }
        function onSocketMessage(e) {
            Client.processResponse(e.data, e);
            var socket = e.target;
            if(socket instanceof WebSocket) {
                Templates.socket.log.entry(e.data, 'I', function(html) {
                    Client.postResponseToClient('LOG socket-log:' + socket.url + ' ' + html);
                });
            }
        }

        newSocket.addEventListener('message', onSocketMessage);
        newSocket.addEventListener('open', onOpen);
        newSocket.addEventListener('close', onClose);

        newSocket.addEventListener('message', Sockets.callEventListeners);
        newSocket.addEventListener('open', Sockets.callEventListeners);
        newSocket.addEventListener('close', Sockets.callEventListeners);

        Templates.socket.log.container(newSocket.url, function(html) {
            Client.postResponseToClient('LOG.REPLACE socket:' + newSocket.url + ' ' + html);
        });

        return newSocket;
    };



    Sockets.callEventListeners = function(e) {
        for(var i=0; i<eventListeners.length; i++)
            if(eventListeners[i][0] === e.type)
                eventListeners[i][1](e);
    };
    Sockets.addEventListener = function(type, listener) {
        Sockets.removeEventListener(listener);
        eventListeners.push([type, listener]);
    };
    Sockets.removeEventListener = function(listener) {
        for(var i=0; i<eventListeners.length; i++) {
            var entry = eventListeners[i];
            if(entry[1] === listener) {
                eventListeners.splice(i, 1);
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

            for(var j=0; j<activeSockets.length; j++) {
                if(activeSockets[j].readyState === WebSocket.OPEN) {
                    openSocket = activeSockets[j];
                    onSelected(openSocket);
                    onSelected = function() {};
                    return;
                }
            }

            if(socketList.length <= i)
                throw new Error("No more sockets");
            var socket = Sockets.get(socketList[i++]);
            if(socket.readyState === WebSocket.OPEN) {
                openSocket = socket;
                onSelected(socket);
                onSelected = function() {};
                return;
            }

            socket.addEventListener('open', onOpen);
            function onOpen(e) {
                socket.removeEventListener('open', onOpen);
                if(!openSocket) {
                    openSocket = socket;
                    onSelected(socket);
                    onSelected = function() {};
                }
            }
        }

    };



    Sockets.send = function(commandString, withSocket) {
        function send(socket){
            Templates.socket.log.entry(commandString, 'O', function(html) {
                Client.postResponseToClient('LOG socket-log:' + socket.url + ' ' + html);
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

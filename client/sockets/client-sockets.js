/**
 * Created by ari on 6/19/2015.
 */

ClientSockets.NEXT_SOCKET_INTERVAL = 5000;
ClientSockets.SOCKET_RECONNECT_INTERVAL = 5000;

function ClientSockets(socketURL) {
    return ClientSockets.get(socketURL);
}

(function() {

    var eventListeners = [];
    var activeSockets = [];
    var socketURLList = [];
    var reconnectTimeout = null;

    ClientSockets.addURL = function(socketURL) {
        socketURLList.push(socketURL);
    };

    importScripts('client/sockets/client-sockets-defaults.js');

    ClientSockets.getAll = function() { return activeSockets; };

    ClientSockets.get = function(socketURL) {
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

            Client.log(
                "<span class='direction'>S</span> " +
                "<span class='action'>SOCKET OPEN</span>: " +
                newSocket.url
            );

            setTimeout(function () {
                newSocket.send("NICK relay" + Date.now().toString().substr(6));
            }, 500);
            //newSocket.send("AUTH AEA00E8FAA7CF1D1");
            //newSocket.send("AUTH AEA00E8FAA7CF1D1");
            renderClientSocketsWindow();
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
                ClientSockets.get(socketURL);
            }, ClientSockets.SOCKET_RECONNECT_INTERVAL);

            Client.log(
                "<span class='direction'>S</span> " +
                "<span class='action'>SOCKET CLOSED</span>: " +
                newSocket.url
            );

            renderClientSocketsWindow();
        }

        function onSocketMessage(e) {
//             console.info("I " + e.data);
            Client.processResponse(e.data, e);
            var socket = e.target;
            if(socket instanceof WebSocket) {
                Client.log(
                    "<span class='direction'>I</span> " +
                    "<span class='command'>" + e.data + "</span>"
                );
            }
        }

        newSocket.addEventListener('message', onSocketMessage);
        newSocket.addEventListener('open', onOpen);
        newSocket.addEventListener('close', onClose);

        newSocket.addEventListener('message', ClientSockets.callEventListeners);
        newSocket.addEventListener('open', ClientSockets.callEventListeners);
        newSocket.addEventListener('close', ClientSockets.callEventListeners);

        renderClientSocketsWindow();

        return newSocket;
    };



    ClientSockets.callEventListeners = function(e) {
        for(var i=0; i<eventListeners.length; i++)
            if(eventListeners[i][0] === e.type)
                eventListeners[i][1](e);
    };
    ClientSockets.addEventListener = function(type, listener) {
        ClientSockets.removeEventListener(listener);
        eventListeners.push([type, listener]);
    };
    ClientSockets.removeEventListener = function(listener) {
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
    ClientSockets.getFastestAsync = function(onSelected, socketList) {
        if(typeof socketList === 'undefined')
            socketList = socketURLList.slice();

        var i=0;
        var openSocket = false;
        nextSocketInterval = setInterval(nextSocket, ClientSockets.NEXT_SOCKET_INTERVAL);
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

            if(socketList.length <= i) {
                i = 0;
                throw new Error("No more sockets");
            }
            var socket = ClientSockets.get(socketList[i++]);
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



    ClientSockets.send = function(commandString, e, withSocket) {
        function send(socket){
            socket.send(commandString);
            Client.log(
                "<span class='direction'>O</span> " +
                "<span class='command'>" + commandString + "</span>"
            );
        }
        if(withSocket) {
            send(withSocket);

        } else {
            ClientSockets.getFastestAsync(function(selectedSocket) {
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

    function renderClientSocketsWindow() {
        self.module = {exports: {}};
        importScripts('client/sockets/render/sockets-window.js');

        // Render sockets window
        self.module.exports.renderClientSocketsWindow(socketURLList, activeSockets, function(html) {
            Client.render(html);
        });
    }

})();

/**
 * Created by ari on 6/19/2015.
 */

(function() {
    var NEXT_SOCKET_INTERVAL = 5000;
    var SOCKET_RECONNECT_INTERVAL = 5000;

    var PATH_PREFIX_SOCKET = 'socket:';
    var CLASS_SOCKET_CONTENT = 'socket-content';

    var HEADER_COMMANDS_TEMPLATE =
        "<div class='header-commands'>" +
            "<a class='header-command-minimize' href='#MINIMIZE {$channel_class}'>[-]</a>" +
            "<a class='header-command-maximize' href='#MAXIMIZE {$channel_class}'>[+]</a>" +
            "<a class='header-command-close' href='#CLOSE {$channel_class}'>[x]</a>" +
        "</div>";

    var SOCKET_TEMPLATE =
        "<article class='{$attr_class} minimized' data-sort='z'>" +
            "<link rel='stylesheet' href='socket/socket.css' type='text/css'>" +
            "<header><a href='#MINIMIZE {$channel_class}'><span class='command'>Socket</span> {$socket_host}</a></header>" +
            "{$html_header_commands}" +
            "<fieldset class='" + CLASS_SOCKET_CONTENT + "'></fieldset>" +
            //"<input name='message' type='text' placeholder='Send a message directly the socket [hit enter]'/>" +
            //"<input type='submit' value='Send' name='submit-send-socket' />" +
            "</form>" +
        "</article>";

    var SOCKET_TEMPLATE_LOG_ENTRY = '<div class="socket-log">' +
        '<span class="direction">{$DIR}</span>' +
        ': <span class="message">{$content}</span>' +
        '</div>';

    var SOCKET_TEMPLATE_ACTION_ENTRY = '<div class="socket-log">' +
        '<span class="action">{$content}</span>' +
        '</div>';

    importScripts('command-defaults.js');

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
        if(!socketURL)
            throw new Error("Invalid socket url");
        for(var j=0; j<activeSockets.length; j++)
            if (activeSockets[j].url === socketURL)
                return activeSockets[j];

        var newSocket = new WebSocket(socketURL);
        function onOpen(e) {
            if(newSocket.readyState != WebSocket.OPEN)
                return;
            newSocket.removeEventListener('open', onOpen);
            //self.postMessage("SOCKET OPEN " + socketURL);

            for(var i=0; i<onNewSocketOpenCallbacks.length; i++)
                onNewSocketOpenCallbacks[i](newSocket);

            self.routeResponseToClient('LOG ' + PATH_PREFIX_SOCKET + newSocket.url + ' .' + CLASS_SOCKET_CONTENT + ' ' + SOCKET_TEMPLATE_ACTION_ENTRY
                .replace(/{\$content}/gi, "SOCKET OPEN: " + newSocket.url)
            );
        }
        function onClose(e) {
            console.log("SOCKET CLOSED: ", e.currentTarget, e.reason, e);
            //self.postMessage("SOCKET CLOSED " + socketURL);

            newSocket.removeEventListener('close', onClose);
            var activeSockets = 0;
            for(var j=0; j<activeSockets.length; j++) {
                activeSockets += newSocket.readyState === WebSocket.OPEN ? 1 : 0;
                if (activeSockets[j].url === socketURL)
                    activeSockets.splice(j, 1);
            }

            if(activeSockets === 0) {
                setTimeout(function () {
                    console.info("Reconnecting to: " + socketURL);
                    self.getSocket(socketURL);
                }, SOCKET_RECONNECT_INTERVAL);
            }

            self.routeResponseToClient('LOG ' + PATH_PREFIX_SOCKET + newSocket.url + ' .' + CLASS_SOCKET_CONTENT + ' ' + SOCKET_TEMPLATE_ACTION_ENTRY
                .replace(/{\$content}/gi, "SOCKET CLOSED: " + newSocket.url)
            );
        }
        function onSocketMessage(e) {
//             console.log("SOCKET IN: ", e.data);
            self.executeWorkerResponse(e.data, e);

        }

        newSocket.addEventListener('message', onSocketMessage);
        newSocket.addEventListener('open', onOpen);
        newSocket.addEventListener('close', onClose);
        activeSockets.push(newSocket);

        self.routeResponseToClient('LOG.REPLACE ' + PATH_PREFIX_SOCKET + newSocket.url + ' * ' + SOCKET_TEMPLATE
                .replace(/{\$socket_host}/gi, newSocket.url.split('/')[2])
                .replace(/{\$socket_url}/gi, newSocket.url)
        );

        return newSocket;
    };

    var nextSocketInterval = null;
    self.selectFastestSocket = function(onSelected, socketList) {
        if(typeof socketList === 'undefined')
            socketList = socketDefaultList.slice();

        var i=0;
        var openSocket = false;
        nextSocketInterval = setInterval(nextSocket, NEXT_SOCKET_INTERVAL);
        nextSocket();

        function nextSocket() {
            if(openSocket) {
                clearInterval(nextSocketInterval);
                return;
            }

            if(socketList.length <= i)
                throw new Error("No more sockets");
            var socket = self.getSocket(socketList[i++]);
            if(socket.readyState === WebSocket.OPEN) {
                openSocket = socket;
                onSelected(socket);
                return;
            }

            socket.addEventListener('open', onOpen);
            function onOpen(e) {
                this.removeEventListener('open', onOpen);
                if(!openSocket) {
                    openSocket = socket;
                    onSelected(socket);
                }
            }
        }

    };


    self.sendWithFastestSocket = function(commandString, commandPath) {
        var socketList = socketDefaultList;
        if(commandPath) {
            for(var i=0; i<socketListByPath.length; i++) {
                var test = socketListByPath[i][0];
                if((typeof test === 'object')
                        ? test.test(commandPath)
                        : commandPath.substr(0, test.length).toLowerCase() === test.toLowerCase()) {
                    socketList = socketListByPath[i][1];
                    break;
                }
            }
        }

        self.selectFastestSocket(function(selectedSocket) {
            self.sendWithSocket(selectedSocket, commandString);
        }, socketList);
    };

    self.sendWithSocket = function(socket, commandString) {
        self.routeResponseToClient('LOG ' + PATH_PREFIX_SOCKET + socket.url + ' .' + CLASS_SOCKET_CONTENT + ' ' + SOCKET_TEMPLATE_LOG_ENTRY
                .replace(/{\$DIR}/g, "O")
                .replace(/{\$content}/gi, commandString)
        );
        socket.send(commandString);
        //             console.log("SOCKET OUT (" + selectedSocket.url + "): " + commandString);
    };


    self.routeResponseToClient = function(commandResponse) {
        self.postMessage(commandResponse
            .replace(/{\$html_header_commands}/gi, HEADER_COMMANDS_TEMPLATE)
        );
    };

    self.executeWorkerCommand = function(commandString, e) {
        var socket = e.target;
        var message = commandString;
        if(typeof message === 'object')
            message = message.message;
        var cmd = message.split(/\s+/, 1)[0].toLowerCase();

        if(typeof socketCommands[cmd] === 'undefined') {
            for(var scriptPath in socketAutoLoaders) {
                if(socketAutoLoaders.hasOwnProperty(scriptPath)) {
                    var autoLoadMethods = socketAutoLoaders[scriptPath];
                    if(autoLoadMethods.indexOf(cmd) !== -1) {
                        importScripts(scriptPath);
                        console.info("Loaded: " + scriptPath);
                        break;
                    }
                }
            }
        }

        if(typeof socketCommands[cmd] === 'undefined')
            throw new Error("Command failed to load: " + cmd);


        return socketCommands[cmd](commandString, e);
    };


    self.executeWorkerResponse = function(commandResponse, e) {
        var socket = e.target;
        var cmd = /^\w+/.exec(commandResponse)[0].toLowerCase();

        if(typeof socketResponses[cmd] === 'undefined') {
            for(var scriptPath in socketAutoLoaders) {
                if(socketAutoLoaders.hasOwnProperty(scriptPath)) {
                    var autoLoadMethods = socketAutoLoaders[scriptPath];
                    if(autoLoadMethods.indexOf(cmd) !== -1) {
                        importScripts(scriptPath);
                        console.info("Loaded: " + scriptPath);
                        break;
                    }
                }
            }
        }

        if(typeof socketResponses[cmd] === 'undefined')
            throw new Error("Command Response failed to load: " + cmd);

        if(socket instanceof WebSocket) {
            self.routeResponseToClient('LOG ' + PATH_PREFIX_SOCKET + socket.url + ' .' + CLASS_SOCKET_CONTENT + ' ' + SOCKET_TEMPLATE_LOG_ENTRY
                .replace(/{\$DIR}/g, "I")
                .replace(/{\$content}/gi, commandResponse
                    .replace(/&/g, '&amp;')
                    .replace(/&amp;amp;/, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                )
            );
        }


        return socketResponses[cmd](commandResponse, e);
    };

})();

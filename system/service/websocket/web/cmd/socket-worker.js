/**
 * Created by ari on 6/19/2015.
 */

(function() {
    var SOCKET_RECONNECT_INTERVAL = 5000;

    var PATH_PREFIX_SOCKET = 'socket:';
    var CLASS_CHANNEL_CONTENT = 'channel-content';

    var SOCKET_TEMPLATE =
        "<legend>Socket: {$socket_host}</legend>" +
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "' style='overflow: auto; max-height: 20vw; max-width: 20vw;'></fieldset>" +
        //"<input name='message' type='text' placeholder='Send a message directly the socket [hit enter]'/>" +
        //"<input type='submit' value='Send' name='submit-send-socket' />" +
        "</form>";

    var SOCKET_TEMPLATE_LOG_ENTRY = '<div class="socket-log">' +
        '<span class="direction">{$DIR}</span>' +
        ': <span class="message">{$content}</span>' +
        '</div>';

    var SOCKET_TEMPLATE_ACTION_ENTRY = '<div class="socket-log">' +
        '<span class="action">{$content}</span>' +
        '</div>';

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

            self.routeResponseToClient('LOG.PREPEND ' + PATH_PREFIX_SOCKET + newSocket.url + ' .' + CLASS_CHANNEL_CONTENT + ' ' + SOCKET_TEMPLATE_ACTION_ENTRY
                .replace(/{\$content}/gi, "SOCKET OPEN: " + newSocket.url)
            );
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

            self.routeResponseToClient('LOG.PREPEND ' + PATH_PREFIX_SOCKET + newSocket.url + ' .' + CLASS_CHANNEL_CONTENT + ' ' + SOCKET_TEMPLATE_ACTION_ENTRY
                .replace(/{\$content}/gi, "SOCKET CLOSED: " + newSocket.url)
            );
        }
        function onSocketMessage(e) {
            console.log("SOCKET IN: ", e.data);
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

    self.selectFastestSocket = function(onSelected, socketList) {
        if(typeof socketList === 'undefined')
            socketList = socketDefaultList.slice();

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
            console.log("SOCKET OUT (" + selectedSocket.url + "): " + commandString);
            selectedSocket.send(commandString);
        }, socketList);
    };


    self.routeResponseToClient = function(commandResponse) {
        self.postMessage(commandResponse);
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

        if(socket instanceof WebSocket) {
            self.routeResponseToClient('LOG.PREPEND ' + PATH_PREFIX_SOCKET + socket.url + ' .' + CLASS_CHANNEL_CONTENT + ' ' + SOCKET_TEMPLATE_LOG_ENTRY
                    .replace(/{\$dir}/g, "out")
                    .replace(/{\$DIR}/g, "OUT")
                    .replace(/{\$content}/gi, commandString)
            );
        }

        return socketCommands[cmd](commandString, e);
    };


    self.executeWorkerResponse = function(commandResponse, e) {
        var socket = e.target;
        var cmd = commandResponse.split(/\s+/, 1)[0].toLowerCase();

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
            self.routeResponseToClient('LOG.PREPEND ' + PATH_PREFIX_SOCKET + socket.url + ' .' + CLASS_CHANNEL_CONTENT + ' ' + SOCKET_TEMPLATE_LOG_ENTRY
                    .replace(/{\$dir}/g, "in")
                    .replace(/{\$DIR}/g, "IN")
                    .replace(/{\$content}/gi, commandResponse)
            );
        }

        return socketResponses[cmd](commandResponse, e);
    };

})();

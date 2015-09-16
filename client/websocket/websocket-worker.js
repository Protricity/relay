/**
 * Created by ari on 6/19/2015.
 */

(function() {
    var NEXT_SOCKET_INTERVAL = 5000;
    var SOCKET_RECONNECT_INTERVAL = 5000;

    var PATH_PREFIX_SOCKET = 'socket:';
    var CLASS_SOCKET_CONTENT = 'websocket-log';


    importScripts('websocket/websocket-templates.js');
    importScripts('websocket/websocket-defaults.js');

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
            templateSocketActionEntry("SOCKET OPEN: " + newSocket.url, function(html) {
                self.routeResponseToClient('LOG socket-log:' + newSocket.url + ' ' + html);
            });
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

            templateSocketActionEntry("SOCKET CLOSED: " + newSocket.url, function(html) {
                self.routeResponseToClient('LOG socket-log:' + newSocket.url + ' ' + html);
            });
        }
        function onSocketMessage(e) {
//             console.log("SOCKET IN: ", e.data);
            self.executeWorkerResponse(e.data, e);

        }

        newSocket.addEventListener('message', onSocketMessage);
        newSocket.addEventListener('open', onOpen);
        newSocket.addEventListener('close', onClose);
        activeSockets.push(newSocket);

        templateSocketLog(newSocket.url, function(html) {
            self.routeResponseToClient('LOG.REPLACE socket:' + newSocket.url + ' ' + html);
        });

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
        templateSocketLogEntry(commandString, 'O', function(html) {
            self.routeResponseToClient('LOG socket-log:' + socket.url + ' ' + html);
        });
        socket.send(commandString);
        //             console.log("SOCKET OUT (" + selectedSocket.url + "): " + commandString);
    };

    function lookupAndReplaceTags(tagString, callback) {
        var match =         /{([^}]+)}/.exec(tagString);
        if(!match)
            throw new Error("Invalid Tag: " + tagString);
        var tagName = match[1];
        var tagNamespace = 'websocket';
        if(tagName.indexOf('::') !== -1) {
            tagNamespace = tagName.split('::', 2)[0].toLowerCase();
            if(!/^\w+$/.test(tagNamespace)) {
                console.error("Invalid Tag Namespace: " + tagString);
                callback(tagString);
                return;
            }

        }
        importScripts(tagNamespace + '/' + tagNamespace + '-tags.js');

        var found = false;
        for(var i=0; i<templateTags.length && !found; i++) (function(templateTag) {
            var regex = templateTag[0];
            if(regex.test(tagString)) {
                var tagCall = templateTag[1];
                if(typeof tagCall === 'function') {
                    tagString.replace(regex, function(tagString) {
                        var args = Array.prototype.slice.call(arguments);
                        args.unshift(callback);
                        tagCall.apply(tagCall, args);
                        found = true;
                    });

                } else {
                    tagString = tagString.replace(regex, tagCall);
                    callback(tagString);
                    found = true;
                }
            }
        })(templateTags[i]);

        if(found) {
            console.warn("Could not find tag: " + tagString);
            callback(tagString);
        }
    }

    self.routeResponseToClient = function(commandResponse) {
        function parseTags(tagString, onFinished) {
            if(/{[^}]+}/.test(tagString)) {
                lookupAndReplaceTags(tagString, parseTags);

            } else {
                onFinished(tagString);
            }
        }
        parseTags(commandResponse, self.postMessage);
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
//                         console.info("Loaded: " + scriptPath);
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
//                         console.info("Loaded: " + scriptPath);
                        break;
                    }
                }
            }
        }

        if(typeof socketResponses[cmd] === 'undefined')
            throw new Error("Command Response failed to load: " + cmd);

        if(socket instanceof WebSocket) {
            templateSocketLogEntry(commandResponse, 'I', function(html) {
                self.routeResponseToClient('LOG socket-log:' + socket.url + ' ' + html);
            });
        }

        return socketResponses[cmd](commandResponse, e);
    };

})();

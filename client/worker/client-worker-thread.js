/**
 * Created by ari on 6/19/2015.
 */

if(typeof importScripts === 'undefined')
    throw new Error("Invalid Environment");

if (!module) var module = {exports:{}};
module.exports.ClientWorkerThread = typeof self.ClientWorkerThread !== 'undefined' ? self.ClientWorkerThread : self.ClientWorkerThread =
(function() {

    function ClientWorkerThread() {
    }

    self.addEventListener('message', function (e) {
        ClientWorkerThread.execute(e.data, e);
    }, false);

    if(typeof Crypto === 'undefined') {
        importScripts('pgp/lib/support/nfcrypto.js');
        Crypto = self.nfCrypto;
    }


    var handlerCounter = 0;
    var responseHandlers = [];
    var commandHandlers = [];
    var commandHistory = [];

    var consoleExports = false;
    ClientWorkerThread.log = function(message) {
        if(!consoleExports) {
            self.module = {exports: {}};
            importScripts('client/console/render/console-window.js');
            consoleExports = self.module.exports;

            // Render log window
            consoleExports.renderConsoleWindow(function(html) {
                ClientWorkerThread.render(html);
            });
        }
        consoleExports.renderConsoleEntry(message, function(html) {
            ClientWorkerThread.render(html);
        });
//         console.log(message);
    };

    ClientWorkerThread.postResponseToClient = function(responseString) {
        self.postMessage(responseString);
    };

    ClientWorkerThread.sendWithSocket = function(commandString, e, withSocket) {
        if(typeof ClientSockets === 'undefined')
            importScripts('client/sockets/client-sockets.js');
        return ClientSockets.send(commandString, e, withSocket);
    };


    ClientWorkerThread.addCommand = function (commandCallback, prepend) {
        if(commandHandlers.indexOf(commandCallback) >= 0)
            throw new Error("Command Callback already added: " + commandCallback);
        commandHandlers[prepend ? 'unshift' : 'push'](commandCallback);
        handlerCounter++;
    };

    ClientWorkerThread.removeCommand = function (commandCallback) {
        var pos = commandHandlers.indexOf(commandCallback);
        if(pos === -1)
            throw new Error("Command Callback not added: " + commandCallback);
        commandHandlers.splice(pos, 1);
        handlerCounter++;
    };

    ClientWorkerThread.addResponse = function (responseCallback, prepend) {
        if(responseHandlers.indexOf(responseCallback) >= 0)
            throw new Error("Response Callback already added: " + responseCallback);
        responseHandlers[prepend ? 'unshift' : 'push'](responseCallback);
        handlerCounter++;
        return responseHandlers;
    };

    ClientWorkerThread.removeResponse = function (responseCallback) {
        var pos = responseHandlers.indexOf(responseCallback);
        if(pos === -1)
            throw new Error("Response Callback not added: " + responseCallback);
        responseHandlers.splice(pos, 1);
        handlerCounter++;
    };

    ClientWorkerThread.execute = function(commandString, e) {
        var oldCounter = handlerCounter;
        for(var i=0; i<commandHandlers.length; i++)
            if(commandHandlers[i](commandString, e))
                return (function() {
                    var parts = commandString.split(' ');
                    var part1 = parts.shift();
                    var part2 = parts.join(' ');
                    ClientWorkerThread.log(
                        '<span class="direction">$</span> ' +
                        '<span class="command">' + part1 + "</span>" + (part2 ? ' ' + part2 : '')
                    );

                    // TODO: add to history based on event

                    return true;
                })();

        if(handlerCounter > oldCounter)
        // Commands were added or removed, so try again
            return ClientWorkerThread.execute(commandString, e);

        var err = "Client Command Handlers (" + commandHandlers.length + ") could not handle: " + commandString;
        ClientWorkerThread.log('<span class="error">' + err + '</span>');
        console.error(err, commandHandlers);

        //Client.postResponseToClient("ERROR " + err);
        return false;
    };

    ClientWorkerThread.processResponse = function(responseString, e) {
        var oldCounter = handlerCounter;
        for(var i=0; i<responseHandlers.length; i++)
            if(responseHandlers[i](responseString, e)) {

                // TODO: only pass if handled?
                // Pass response event to client thread
                ClientWorkerThread.postResponseToClient(responseString);

                var parts = responseString.split(' ');
                var part1 = parts.shift();
                var part2 = parts.join(' ');
                ClientWorkerThread.log(
                    '<span class="direction">I</span> ' + // TODO: direction based on remote or local
                    '<span class="response">' + part1 + "</span>" + (part2 ? ' ' + part2 : '')
                );

                return true;
            }



        if(handlerCounter > oldCounter)
        // Commands were added or removed, so try again
            return ClientWorkerThread.processResponse(responseString, e);

        var err = "Client Response Handlers could not handle: " + responseString;
        ClientWorkerThread.log('<span class="error">' + err + '</span>');
        console.error(err, responseHandlers);

        //Client.postResponseToClient("ERROR " + err);
        return false;
    };

    ClientWorkerThread.render = function(content, callback) {
        parseClientTags(content, function(parsedContent) {
            ClientWorkerThread.postResponseToClient("RENDER " + parsedContent);
            (callback || function(){})();
        });
    };

    ClientWorkerThread.getCommandHistory = function() {
        return commandHistory.slice();
    };

    ClientWorkerThread.addCommandToHistory = function(commandString) {
        commandHistory.push(commandString);
    };

    function parseClientTags(tagHTML, callback) {
        var match = /\{([a-z][^}]+)}/.exec(tagHTML);
        if (!match) {
            callback(tagHTML);
            return;
        }

        var tagString = match[0];

        self.module = {exports: {}};
        importScripts('ui/tags/client-tag-list.js');
        var tags = self.module.exports.tags;

        for (var i = 0; i < tags.length; i++) {
            if (tags[i][0].test(tagString)) {
                tags[i][1](tagString, function (tagReplacedContent) {
                    tagHTML = tagHTML
                        .replace(tagString, tagReplacedContent);
                    parseClientTags(tagHTML, callback);
                }, ClientWorkerThread);
                return;
            }
        }

        throw new Error("Invalid Tag(" + tags.length+ "): " + tagString);
    }

    ClientWorkerThread.includeScript = function(path, callback) {
        if(typeof require === 'function')
            return require('../' + path);

        self.module = {exports: {}};
        importScripts(path);
        callback(self.module.exports);
    };

    self.module = {exports: {}};
    importScripts('client/client-command-proxies.js');
    self.module.exports.initClientCommands(ClientWorkerThread);

    // Socket Client
    ClientWorkerThread.addCommand(consoleCommand);
    function consoleCommand(commandString, e) {
        var match = /^(log|info|error|assert|warn)\s*([\s\S]*)$/i.exec(commandString);
        if(!match)
            return false;

        var command = match[1].toLowerCase();
        var value = match[2];
        console[command](commandString);
        ClientWorkerThread.log(
            "<span class='direction'>$</span> " +
            "<span class='command " + command + "'>" + value + "</span>"
        );
        return true;
    }

    ClientWorkerThread.addResponse(consoleResponse);
    function consoleResponse(responseString, e) {
        var match = /^(log|info|error|assert|warn)\s*([\s\S]*)$/i.exec(responseString);
        if(!match)
            return false;

        var command = match[1].toLowerCase();
        var value = match[2];
        console[command](value);
        ClientWorkerThread.log(
            "<span class='direction'>I</span> " +
            "<span class='response " + command + "'>" + value + "</span>"
        );
        return true;
    }

    ClientWorkerThread.addResponse(serverResponse);
    function serverResponse(responseString, e) {
        var match = /^server/i.exec(responseString);
        if(!match)
            return false;

        var versionSplit = responseString.split(' ', 3);
        e.target.VERSION = versionSplit[1];
        e.target.VERSION_STRING = versionSplit[2];
        console.info("Socket Server Version: " + versionSplit[2]); // , e.target);
        ClientSockets.refreshSocketsWindow();
        ClientWorkerThread.log(
            "<span class='direction'>I</span> " +
            "<span class='response'>" + responseString + "</span>"
        );
        return true;
    }


    // Window Client
    ClientWorkerThread.addCommand(channelButtonCommand);
    function channelButtonCommand(commandString, e) {
        if(!/^(minimize|maximize|close|open|toggle)/i.test(commandString))
            return false;
        ClientWorkerThread.postResponseToClient(commandString);
        return true;
    }


    // Client Render
    ClientWorkerThread.addCommand(clientRenderCommand);
    function clientRenderCommand(commandString, e) {
        if(!/^(render|replace|append|prepend)/i.test(commandString))
            return false;
        parseClientTags(commandString, function(parsedCommandString) {
            ClientWorkerThread.postResponseToClient(parsedCommandString);
        });
        return true;
    }


    // Client Events
    ClientWorkerThread.addResponse(passToClientCommand);
    function passToClientCommand(commandString, e) {
        if(!/^(event)/i.test(commandString))
            return false;
        ClientWorkerThread.postResponseToClient(commandString);
        return true; // TODO: return false?;
    }


    return ClientWorkerThread;
})();

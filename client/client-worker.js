/**
 * Created by ari on 6/19/2015.
 */
"use strict";

if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.Client = ClientWorker;

var tagCallbacks = {};

function ClientWorker() {
}

(function() {

    var handlerCounter = 0;
    var responseHandlers = [];
    var commandHandlers = [];

    ClientWorker.sendWithSocket = function(commandString, e, withSocket) {
        if(typeof ClientSockets === 'undefined')
            importScripts('client/sockets/client-sockets.js');
        return ClientSockets.send(commandString, e, withSocket);
    };


    ClientWorker.addCommand = function (commandCallback, prepend) {
        if(commandHandlers.indexOf(commandCallback) >= 0)
            throw new Error("Command Callback already added: " + commandCallback);
        commandHandlers[prepend ? 'unshift' : 'push'](commandCallback);
        handlerCounter++;
    };

    ClientWorker.removeCommand = function (commandCallback) {
        var pos = commandHandlers.indexOf(commandCallback);
        if(pos === -1)
            throw new Error("Command Callback not added: " + commandCallback);
        commandHandlers.splice(pos, 1);
        handlerCounter++;
    };

    ClientWorker.addResponse = function (responseCallback, prepend) {
        if(responseHandlers.indexOf(responseCallback) >= 0)
            throw new Error("Response Callback already added: " + responseCallback);
        responseHandlers[prepend ? 'unshift' : 'push'](responseCallback);
        handlerCounter++;
        return responseHandlers;
    };

    ClientWorker.removeResponse = function (responseCallback) {
        var pos = responseHandlers.indexOf(responseCallback);
        if(pos === -1)
            throw new Error("Response Callback not added: " + responseCallback);
        responseHandlers.splice(pos, 1);
        handlerCounter++;
    };

    ClientWorker.execute = function(commandString, e) {
        var oldCounter = handlerCounter;
        for(var i=0; i<commandHandlers.length; i++)
            if(commandHandlers[i](commandString, e))
                return (function() {

                    var parts = commandString.split(' ', 2);
                    ClientWorker.log(
                        '<span class="direction">$</span> ' +
                        '<span class="command">' + parts[0] + '</span>' + (parts[1] ? ' ' + parts[1] : '')
                    );
                    return true;
                })();

        if(handlerCounter > oldCounter)
            // Commands were added or removed, so try again
            return ClientWorker.execute(commandString, e);

        var err = "Client Command Handlers (" + commandHandlers.length + ") could not handle: " + commandString;
        ClientWorker.log('<span class="error">' + err + '</span>');
        console.error(err, commandHandlers);

        //Client.postResponseToClient("ERROR " + err);
        return false;
    };

    ClientWorker.processResponse = function(responseString, e) {
        var oldCounter = handlerCounter;
        for(var i=0; i<responseHandlers.length; i++)
            if(responseHandlers[i](responseString, e)) {
                var parts = responseString.split(' ', 2);

                // TODO: only pass if handled?
                // Pass response event to client thread
                ClientWorker.postResponseToClient(responseString);

                ClientWorker.log(
                    '<span class="direction">I</span> ' +
                    '<span class="response">' + parts[0] + '</span>' + (parts[1] ? ' ' + parts[1] : '')
                );

                return true;
            }



        if(handlerCounter > oldCounter)
            // Commands were added or removed, so try again
            return ClientWorker.processResponse(responseString, e);

        var err = "Client Response Handlers could not handle: " + responseString;
        ClientWorker.log('<span class="error">' + err + '</span>');
        console.error(err, commandHandlers);

        //Client.postResponseToClient("ERROR " + err);
        return false;
    };

    ClientWorker.render = function(content, callback) {
        parseClientTags(content, function(parsedContent) {
            ClientWorker.postResponseToClient("RENDER " + parsedContent);
            (callback || function(){})();
        });
    };

    ClientWorker.appendChild = function(targetClass, childContent) {
        //parseClientTags(childContent, function(parsedContent) {
            ClientWorker.postResponseToClient("APPEND " + targetClass + " " + childContent);
        //});
    };

    ClientWorker.prependChild = function(targetClass, childContent) {
        //parseClientTags(childContent, function(parsedContent) {
            ClientWorker.postResponseToClient("PREPEND " + targetClass + " " + childContent);
        //});
    };

    ClientWorker.replace = function(targetClass, replaceContent) {
        //parseClientTags(replaceContent, function(parsedContent) {
            ClientWorker.postResponseToClient("REPLACE " + targetClass + " " + replaceContent);
        //});
    };

    ClientWorker.postResponseToClient = function(responseString) {
        self.postMessage(responseString);
    };

    var consoleExports = false;
    ClientWorker.log = function(message) {
        if(!consoleExports) {
            self.module = {exports: {}};
            importScripts('client/console/render/console-window.js');
            consoleExports = self.module.exports;

            // Render log window
            consoleExports.renderConsoleWindow(function(html) {
                ClientWorker.render(html);
            });
        }
        consoleExports.renderConsoleEntry(message, function(html) {
            ClientWorker.appendChild("console-content:", html);
        });
//         console.log(message);
    };


    function parseClientTags(tagHTML, callback) {
        var match = /\{([a-z][^}]+)}/.exec(tagHTML);
        if (!match) {
            callback(tagHTML);
            return;
        }

        var tagString = match[0];

        var tags = ClientWorker.require('client/tags/client-tag-list.js').tags;
        for (var i = 0; i < tags.length; i++) {
            if (tags[i][0].test(tagString)) {
                tags[i][1](tagString, function (tagReplacedContent) {
                    tagHTML = tagHTML
                        .replace(tagString, tagReplacedContent);
                    parseClientTags(tagHTML, callback);
                }, ClientWorker);
                return;
            }
        }

        throw new Error("Invalid Tag(" + tags.length+ "): " + tagString);
    }

    ClientWorker.require = function(path) {
        if(typeof require === 'function')
            return require('../' + path);

        self.exports = {};
        self.module = {exports: {}};
        importScripts(path);
        return self.module.exports;
    };

    ClientWorker.require('client/client-command-proxies.js')
        .initClientCommands(ClientWorker);

// Default

    //var defaultResponse = function(responseString) {
    //    defaultResponse = function(responseString) {
    //        throw new Error("Command Response Handler failed to load: " + responseString);
    //    };
    //
    //};
    //Client.addResponse(/^\w+/, defaultResponse);

    // Socket Client
    ClientWorker.addResponse(consoleResponse);
    function consoleResponse(commandResponse, e) {
        var match = /^(server|info|error|assert|warn)/i.exec(commandResponse);
        if(!match)
            return false;

        var command = match[1].toLowerCase();
        switch(command) {
            case 'server':
                var versionSplit = commandResponse.split(' ', 3);
                e.target.VERSION = versionSplit[1];
                e.target.VERSION_STRING = versionSplit[2];
                console.info("Socket Server Version: " + versionSplit[2]); // , e.target);
                ClientSockets.refreshSocketsWindow();
                break;
            default:
                console[command](commandResponse);
                break;
        }
        return true;
    }


    // Window Client
    ClientWorker.addCommand(channelButtonCommand);
    function channelButtonCommand(commandString, e) {
        if(!/^(minimize|maximize|close)/i.test(commandString))
            return false;
        ClientWorker.postResponseToClient(commandString);
        return true;
    }


    // Client Render
    ClientWorker.addCommand(clientRenderCommand);
    function clientRenderCommand(commandString, e) {
        if(!/^(render|replace|append|prepend)/i.test(commandString))
            return false;
        parseClientTags(commandString, function(parsedCommandString) {
            ClientWorker.postResponseToClient(parsedCommandString);
        });
        return true;
    }


    // Client Events
    ClientWorker.addResponse(passToClientCommand);
    function passToClientCommand(commandString, e) {
        if(!/^(event)/i.test(commandString))
            return false;
        ClientWorker.postResponseToClient(commandString);
        return true; // TODO: return false?;
    }

})();

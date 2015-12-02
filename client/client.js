/**
 * Created by ari on 6/19/2015.
 */
"use strict";

if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.Client = Client;

var tagCallbacks = {};

function Client() {
}

(function() {

    var handlerCounter = 0;
    var responseHandlers = [];
    var commandHandlers = [];

    Client.sendWithSocket = function(commandString, e, withSocket) {
        if(typeof ClientSockets === 'undefined')
            importScripts('client/sockets/client-sockets.js');
        return ClientSockets.send(commandString, e, withSocket);
    };


    Client.addCommand = function (commandCallback, prepend) {
        if(commandHandlers.indexOf(commandCallback) >= 0)
            throw new Error("Command Callback already added: " + commandCallback);
        commandHandlers[prepend ? 'unshift' : 'push'](commandCallback);
        handlerCounter++;
    };

    Client.removeCommand = function (commandCallback) {
        var pos = commandHandlers.indexOf(commandCallback);
        if(pos === -1)
            throw new Error("Command Callback not added: " + commandCallback);
        commandHandlers.splice(pos, 1);
        handlerCounter++;
    };

    Client.addResponse = function (responseCallback, prepend) {
        if(responseHandlers.indexOf(responseCallback) >= 0)
            throw new Error("Response Callback already added: " + responseCallback);
        responseHandlers[prepend ? 'unshift' : 'push'](responseCallback);
        handlerCounter++;
    };

    Client.removeResponse = function (responseCallback) {
        var pos = responseHandlers.indexOf(responseCallback);
        if(pos === -1)
            throw new Error("Response Callback not added: " + responseCallback);
        responseHandlers.splice(pos, 1);
        handlerCounter++;
    };

    Client.execute = function(commandString, e) {
        var oldCounter = handlerCounter;
        for(var i=0; i<commandHandlers.length; i++)
            if(commandHandlers[i](commandString, e))
                return (function() {

                    var parts = commandString.split(' ', 2);
                    Client.log(
                        '<span class="direction">$</span> ' +
                        '<span class="command">' + parts[0] + '</span>' + (parts[1] ? ' ' + parts[1] : '')
                    );
                    return true;
                })();

        if(handlerCounter > oldCounter)
            // Commands were added or removed, so try again
            return Client.execute(commandString, e);

        var err = "Client Command Handlers (" + commandHandlers.length + ") could not handle: " + commandString;
        Client.log('<span class="error">' + err + '</span>');
        console.error(err, commandHandlers);

        //Client.postResponseToClient("ERROR " + err);
        return false;
    };

    Client.processResponse = function(responseString, e) {
        var oldCounter = handlerCounter;
        for(var i=0; i<responseHandlers.length; i++)
            if(responseHandlers[i](responseString, e)) {
                var parts = responseString.split(' ', 2);
                Client.log(
                    '<span class="direction">I</span> ' +
                    '<span class="response">' + parts[0] + '</span>' + (parts[1] ? ' ' + parts[1] : '')
                );

                Client.postResponseToClient("EVENT " + responseString);

                return true;
            }



        if(handlerCounter > oldCounter)
            // Commands were added or removed, so try again
            return Client.processResponse(responseString, e);

        var err = "Client Response Handlers could not handle: " + responseString;
        Client.log('<span class="error">' + err + '</span>');
        console.error(err, commandHandlers);

        //Client.postResponseToClient("ERROR " + err);
        return false;
    };

    Client.render = function(content, callback) {
        parseClientTags(content, function(parsedContent) {
            Client.postResponseToClient("RENDER " + parsedContent);
            (callback || function(){})();
        });
    };

    Client.appendChild = function(targetClass, childContent) {
        //parseClientTags(childContent, function(parsedContent) {
            Client.postResponseToClient("APPEND " + targetClass + " " + childContent);
        //});
    };

    Client.prependChild = function(targetClass, childContent) {
        //parseClientTags(childContent, function(parsedContent) {
            Client.postResponseToClient("PREPEND " + targetClass + " " + childContent);
        //});
    };

    Client.replace = function(targetClass, replaceContent) {
        //parseClientTags(replaceContent, function(parsedContent) {
            Client.postResponseToClient("REPLACE " + targetClass + " " + replaceContent);
        //});
    };

    Client.postResponseToClient = function(responseString) {
        self.postMessage(responseString);
    };

    var consoleExports = false;
    Client.log = function(message) {
        if(!consoleExports) {
            self.module = {exports: {}};
            importScripts('client/console/render/console-window.js');
            consoleExports = self.module.exports;

            // Render log window
            consoleExports.renderConsoleWindow(function(html) {
                Client.render(html);
            });
        }
        consoleExports.renderConsoleEntry(message, function(html) {
            Client.appendChild("console-content:", html);
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

        var tags = Client.require('client/tags/client-tag-list.js').tags;
        for (var i = 0; i < tags.length; i++) {
            if (tags[i][0].test(tagString)) {
                tags[i][1](tagString, function (tagReplacedContent) {
                    tagHTML = tagHTML
                        .replace(tagString, tagReplacedContent);
                    parseClientTags(tagHTML, callback);
                }, Client);
                return;
            }
        }

        throw new Error("Invalid Tag(" + tags.length+ "): " + tagString);
    }

    Client.require = function(path) {
        if(typeof require === 'function')
            return require('../' + path);

        self.exports = {};
        self.module = {exports: {}};
        importScripts(path);
        return self.module.exports;
    };

    Client.require('client/client-command-proxies.js')
        .initClientCommands(Client);

// Default

    //var defaultResponse = function(responseString) {
    //    defaultResponse = function(responseString) {
    //        throw new Error("Command Response Handler failed to load: " + responseString);
    //    };
    //
    //};
    //Client.addResponse(/^\w+/, defaultResponse);

    // Socket Client
    Client.addResponse(consoleResponse);
    function consoleResponse(commandResponse, e) {
        var match = /^(info|error|assert|warn)/i.exec(commandResponse);
        if(!match)
            return false;

        var command = match[1].toLowerCase();
        console[command](commandResponse);
        return true;
    }


    // Window Client
    Client.addCommand(channelButtonCommand);
    function channelButtonCommand(commandString, e) {
        if(!/^(minimize|maximize|close)/i.test(commandString))
            return false;
        Client.postResponseToClient(commandString);
        return true;
    }


    // Client Render
    Client.addCommand(clientRenderCommand);
    function clientRenderCommand(commandString, e) {
        if(!/^(render|replace|append|prepend)/i.test(commandString))
            return false;
        parseClientTags(commandString, function(parsedCommandString) {
            Client.postResponseToClient(parsedCommandString);
        });
        return true;
    }

})();

/**
 * Created by ari on 6/19/2015.
 */
"use strict";

if(!exports) var exports = {};
exports.Client = Client;

var tagCallbacks = {};

function Client() {
}

(function() {

    var responseHandlers = [];
    var commandHandlers = [];

    Client.sendWithSocket = function(commandString, e, withSocket) {
        if(typeof Sockets === 'undefined')
            importScripts('server/socket/sockets.js');
        return Sockets.send(commandString, e, withSocket);
    };


    Client.addCommand = function (commandCallback, prepend) {
        if(commandHandlers.indexOf(commandCallback) >= 0)
            throw new Error("Command Callback already added: " + commandCallback);
        commandHandlers[prepend ? 'unshift' : 'push'](commandCallback);
    };

    Client.removeCommand = function (commandCallback) {
        var pos = commandHandlers.indexOf(commandCallback);
        if(pos === -1)
            throw new Error("Command Callback not added: " + commandCallback);
        commandHandlers.splice(pos, 1);
    };

    Client.addResponse = function (responseCallback, prepend) {
        if(responseHandlers.indexOf(responseCallback) >= 0)
            throw new Error("Response Callback already added: " + responseCallback);
        responseHandlers[prepend ? 'unshift' : 'push'](responseCallback);
    };

    Client.removeResponse = function (responseCallback) {
        var pos = responseHandlers.indexOf(responseCallback);
        if(pos === -1)
            throw new Error("Response Callback not added: " + responseCallback);
        responseHandlers.splice(pos, 1);
    };


    if(typeof require !== 'undefined')
        var exports = require('./client-command-proxies.js');
    else
        importScripts('client/client-command-proxies.js');
    (exports || self.exports).initClientCommands(Client);


    Client.execute = function(commandString, e) {
        var oldLength = commandHandlers.length;
        for(var i=0; i<commandHandlers.length; i++)
            if(commandHandlers[i](commandString, e))
                return true;

        if(commandHandlers.length > oldLength) {
            return Client.execute(commandString, e);

        } else {
            var err = "Client Command Handlers (" + commandHandlers.length + ") could not handle: " + commandString;
            console.error(err, commandHandlers);
            //Client.postResponseToClient("ERROR " + err);
            return false;
        }
    };

    Client.processResponse = function(responseString, e) {
        var oldLength = responseHandlers.length;
        for(var i=0; i<responseHandlers.length; i++)
            if(responseHandlers[i](responseString, e))
                return true;

        if(responseHandlers.length > oldLength) {
            return Client.processResponse(responseString, e);

        } else {
            var err = "Client Response Handlers (" + responseHandlers.length + ") could not handle: " + responseString;
            console.error(err);
            //Client.postResponseToClient("ERROR " + err);
            return false;
        }
    };

    Client.postResponseToClient = function(responseString) {
        self.postMessage(responseString);
    };

    function replaceAllTags(htmlContent, callback) {
        require('client-tags.js').parseClientTags(htmlContent, callback);
    }

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
        Client.postResponseToClient("RENDER." + commandString);
        return true;
    }


    // Client Render
    Client.addCommand(clientRenderCommand);
    function clientRenderCommand(commandString, e) {
        // TODO: subcommands
        var match = /^render(?:\s+(\S+))(?:\s+(\S+))$/im.exec(commandString);
        if(!match)
            return false;

        replaceAllTags(commandString, function(parsedCommandString) {
            Client.postResponseToClient(parsedCommandString);
        });
        return true;
    }


})();

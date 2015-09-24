/**
 * Created by ari on 6/19/2015.
 */
"use strict";

if(!exports) var exports = {};
exports.Client = Client;

var tagCallbacks = {};

function Client() {
    //return Client.execute(commandString);
}


(function() {

    var responseList = [];
    var commandHandlers = [];

    Client.sendWithSocket = function(commandString, e, withSocket) {
        if(typeof Sockets === 'undefined')
            importScripts('server/sockets.js');
        return Sockets.send(commandString, e, withSocket);
    };


    Client.addCommand = function (commandPrefix, commandCallback) {
        if(!(commandPrefix instanceof RegExp))
            commandPrefix = new RegExp('^' + commandPrefix, 'i');
        commandHandlers.push([commandPrefix, commandCallback]);
    };

    Client.removeCommand = function (commandCallback) {
        for(var i=0; i<commandHandlers.length; i++) {
            if(commandHandlers[i][1] === commandCallback) {
                commandHandlers.splice(i, 1);
                return;
            }
        }
        throw new Error("Command Callback not found");
    };

    Client.addResponse = function (responsePrefix, responseCallback) {
        if(!(responsePrefix instanceof RegExp))
            responsePrefix = new RegExp('^' + responsePrefix, 'i');
        responseList.push([responsePrefix, responseCallback]);
    };

    Client.removeResponse = function (responseCallback) {
        for(var i=0; i<responseList.length; i++) {
            if(responseList[i][1] === responseCallback) {
                responseList.splice(i, 1);
                return;
            }
        }
        throw new Error("Response Callback not found");
    };

    importScripts('client/client-command-proxies.js');

    Client.execute = function(commandString, e) {
        for(var i=commandHandlers.length-1; i>=0; i--) {
            if(commandHandlers[i][0].test(commandString)) {
                return commandHandlers[i][1](commandString, e);
            }
        }
        throw new Error("Client Command Handler failed to load: " + commandString);
    };

    Client.processResponse = function(responseString, e) {
        var responseFound = false;
        for(var i=0; i<responseList.length; i++) {
            if(responseList[i][0].test(responseString)) {
                responseFound = true;
                if(responseList[i][1](responseString, e) === true)
                    break;
            }
        }
        if(!responseFound)
            throw new Error("Command Response Handler failed to load: " + responseString);
    };

    Client.postResponseToClient = function(responseString) {
        replaceAllTags(responseString, function(parsedResponseString) {
            self.postMessage(parsedResponseString);
        });
    };

    function replaceAllTags(htmlContent, callback) {
        var match = /{([a-z][^}]+)}/.exec(htmlContent);
        if(!match) {
            callback(htmlContent);
            return;
        }

        var tagString = match[0];
        var tagContent = match[1];
        var tagNamespace = 'websocket';
        if(tagContent.indexOf('::') !== -1) {
            tagNamespace = tagContent.split('::', 2)[0].toLowerCase();
            if(!/^\w+$/.test(tagNamespace))
                throw new Error("Invalid Tag Namespace: " + tagString);
        }
        if(typeof tagCallbacks[tagNamespace] === 'undefined') {
            tagCallbacks[tagNamespace] = false;
            importScripts(tagNamespace + '/' + tagNamespace + '-tags.js');
        }
        var tagCall = tagCallbacks[tagNamespace];

        tagCall(tagString, function(tagContent) {
            replaceAllTags(htmlContent
                    .replace(tagString, tagContent),
                callback
            );
        });
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

    Client.addResponse('info', function(commandResponse) { console.info(commandResponse); });
    Client.addResponse('error', function(commandResponse) { console.error(commandResponse); });
    Client.addResponse('assert', function(commandResponse) { console.assert(commandResponse); });
    Client.addResponse('warn', function(commandResponse) { console.warn(commandResponse); });


// Window Client
    function logToClient(commandString) {
        // TODO: custom logic per window
        return Client.postResponseToClient("LOG." + commandString);
    }
    Client.addCommand('minimize', logToClient);
    Client.addCommand('maximize', logToClient);
    Client.addCommand('close', logToClient);

})();

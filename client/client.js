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
    var commandList = [];
    var proxyList = [];

    Client.sendWithSocket = function(commandString, withSocket) {
        if(typeof Sockets === 'undefined')
            importScripts('socket/sockets.js');
        return Sockets.send(commandString, withSocket);
    };

    Client.addCommand = function (commandPrefix, commandCallback) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                Client.addCommand(commandPrefix[i], commandCallback);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            commandList.push([commandPrefix, commandCallback]);
        }
    };

    Client.addResponse = function (responsePrefix, responseCallback) {
        if(responsePrefix instanceof Array) {
            for(var i=0; i<responsePrefix.length; i++)
                Client.addResponse(responsePrefix[i], responseCallback);

        } else {
            if(!(responsePrefix instanceof RegExp))
                responsePrefix = new RegExp('^' + responsePrefix, 'i');
            responseList.push([responsePrefix, responseCallback]);
        }
    };

    Client.addCommandProxy = function (commandPrefix, scriptPath) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                Client.addCommandProxy(commandPrefix[i], scriptPath);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            proxyList.push([commandPrefix, scriptPath]);
        }
    };

    importScripts('client/client-defaults.js');

    Client.execute = function(commandString, e) {
        for(var i=0; i<commandList.length; i++) {
            if(commandList[i][0].test(commandString)) {
                return commandList[i][1](commandString, e);
            }
        }
        if(tryProxy(commandString)) {
            for(i=0; i<commandList.length; i++) {
                if(commandList[i][0].test(commandString)) {
                    return commandList[i][1](commandString, e);
                }
            }
        }
        throw new Error("Command Handler failed to load: " + commandString);
    };

    Client.processResponse = function(responseString, e) {
        for(var i=0; i<responseList.length; i++) {
            if(responseList[i][0].test(responseString)) {
                return responseList[i][1](responseString, e);
            }
        }
        if(tryProxy(responseString)) {
            for(i=0; i<responseList.length; i++) {
                if(responseList[i][0].test(responseString)) {
                    return responseList[i][1](responseString, e);
                }
            }
        }

        throw new Error("Command Response Handler failed to load: " + responseString);
    };

    Client.postResponseToClient = function(responseString) {
        replaceAllTags(responseString, function(parsedResponseString) {
            self.postMessage(parsedResponseString);
        });
    };

    function tryProxy(contentString) {
        for(var j=0; j<proxyList.length; j++) {
            var proxyRegex = proxyList[j][0];
            if(proxyRegex.test(contentString)) {
                var proxyScript = proxyList[j][1];
                var oldLength = commandList.length + responseList.length;
                importScripts(proxyScript);
                if(commandList.length + responseList.length === oldLength)
                    throw new Error("Imported script failed to add any new commands: " + proxyScript);
                return true;
            }
        }
        return false;
    }

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


})();

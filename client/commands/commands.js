/**
 * Created by ari on 6/19/2015.
 */
"use strict";

var tagCallbacks = {};

function Commands(commandString) {
    return Commands.execute(commandString);
}

(function() {

    var responseList = [];
    var commandList = [];
    var proxyList = [];

    Commands.sendWithSocket = function(commandString, withSocket) {
        if(typeof Sockets === 'undefined')
            importScripts('sockets/sockets.js');
        return Sockets.send(commandString, withSocket);
    };

    Commands.add = function (commandPrefix, commandCallback) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                Commands.add(commandPrefix[i], commandCallback);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            commandList.push([commandPrefix, commandCallback]);
        }
    };

    Commands.addResponse = function (responsePrefix, responseCallback) {
        if(responsePrefix instanceof Array) {
            for(var i=0; i<responsePrefix.length; i++)
                Commands.addResponse(responsePrefix[i], responseCallback);

        } else {
            if(!(responsePrefix instanceof RegExp))
                responsePrefix = new RegExp('^' + responsePrefix, 'i');
            responseList.push([responsePrefix, responseCallback]);
        }
    };

    Commands.addProxy = function (commandPrefix, scriptPath) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                Commands.addProxy(commandPrefix[i], scriptPath);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            proxyList.push([commandPrefix, scriptPath]);
        }
    };

    importScripts('commands/commands-defaults.js');

    Commands.execute = function(commandString, e) {
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

    Commands.processResponse = function(responseString, e) {
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

    Commands.postResponseToClient = function(responseString) {
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

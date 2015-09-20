/**
 * Created by ari on 6/19/2015.
 */
"use strict";

var tagCallbacks = {};

function Commands(commandString) {
    return Commands.execute(commandString);
}

(function() {

    self.addEventListener('message', function (e) {
        Commands.execute(e.data, e);
    });

    var commandList = [];
    var proxyList = [];

    Commands.sendWithSocket = function(commandString, withSocket) {
        if(typeof Sockets === 'undefined')
            importScripts('sockets/sockets.js');
        return Sockets.send(commandString, withSocket);
    };

    Commands.add = function (commandPrefixes, commandCallback) {
        if(typeof commandPrefixes.length === 'undefined')
            commandPrefixes = [commandPrefixes];
        for(var i=0; i<commandPrefixes.length; i++)
            commandList.push([commandPrefixes[i] instanceof RegExp ? commandPrefixes[i] : new RegExp(commandPrefixes[i], 'i'), commandCallback]);
    };
    Commands.addProxy = function (commandPrefixes, scriptPath) {
        if(typeof commandPrefixes.length === 'undefined')
            commandPrefixes = [commandPrefixes];
        for(var i=0; i<commandPrefixes.length; i++)
            proxyList.push([commandPrefixes[i] instanceof RegExp ? commandPrefixes[i] : new RegExp(commandPrefixes[i], 'i'), scriptPath]);
    };

    importScripts('command/command-defaults.js');

    Commands.execute = function(commandString, e) {
        for(var i=0; i<commandList.length; i++) {
            if(commandString.search(commandList[i][0]) === 0) {
                return commandList[i][1](commandString, e);
            }
        }

        for(var j=0; j<proxyList.length; j++) {
            if(commandString.search(proxyList[j][0]) === 0) {
                var oldLength = commandList.length;
                importScripts(proxyList[j][1]);
                if(commandList.length === oldLength)
                    throw new Error("Imported script failed to add any new commands: " + proxyList[j][1]);
                for(i = oldLength; i<commandList.length; i++) {
                    if(commandString.search(commandList[i][0]) === 0) {
                        return commandList[i][1](commandString, e);
                    }
                }
            }
        }

        throw new Error("Command Handler failed to load: " + commandString);
    };

})();



function CommandResponses(responseString) {
    return CommandResponses.postToClient(responseString);
}

(function() {

    var responseList = [];
    var proxyList = [];
    CommandResponses.add = function (responsePrefixes, responseCallback) {
        if(typeof responsePrefixes.length === 'undefined')
            responsePrefixes = [responsePrefixes];
        for(var i=0; i<responsePrefixes.length; i++)
            responseList.push([responsePrefixes[i] instanceof RegExp ? responsePrefixes[i] : new RegExp(responsePrefixes[i], 'i'), responseCallback]);
    };
    CommandResponses.addProxy = function (responsePrefixes, scriptPath) {
        if(typeof responsePrefixes.length === 'undefined')
            responsePrefixes = [responsePrefixes];
        for(var i=0; i<responsePrefixes.length; i++)
            proxyList.push([responsePrefixes[i] instanceof RegExp ? responsePrefixes[i] : new RegExp(responsePrefixes[i], 'i'), scriptPath]);
    };

    CommandResponses.postToClient = function(responseString) {
        replaceAllTags(responseString, function(parsedResponseString) {
            self.postMessage(parsedResponseString);
        });
    };


    CommandResponses.process = function(responseString, e) {
        for(var i=0; i<responseList.length; i++) {
            if(responseString.search(responseList[i][0]) === 0) {
                return responseList[i][1](responseString, e);
            }
        }

        for(var j=0; j<proxyList.length; j++) {
            if(responseString.search(proxyList[j][0]) === 0) {
                var oldLength = responseList.length;
                importScripts(proxyList[j][1]);
                if(responseList.length === oldLength)
                    throw new Error("Imported script failed to add any new commands: " + proxyList[j][1]);
                for(i = oldLength; i<responseList.length; i++) {
                    if(responseString.search(responseList[i][0]) === 0) {
                        return responseList[i][1](responseString, e);
                    }
                }
            }
        }

        throw new Error("Command Response Handler failed to load: " + responseString);
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


})();

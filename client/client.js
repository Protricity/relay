/**
 * Created by ari on 6/19/2015.
 */

function Client() {

}




Client.parseStyleSheets = function(content, includeScripts) {
    var match;
    while(match = /<link([^>]*)\/?>(<\/link>)?/gi.exec(content)) {
        var linkContent = match[0];
        content = content.replace(linkContent, '');
        var match3 = /\s*href=['"]([^'"]*)['"]/gi.exec(match[1]);
        if(match3) {
            var hrefValue = match3[1];
            includeScripts.push(hrefValue);

        } else {
            throw new Error("Invalid Script: " + linkContent);
        }
    }
    return content;
};

Client.parseScripts = function(content, includeScripts) {
    var match;
    while(match = /<script([^>]*)><\/script>/gi.exec(content)) {
        var scriptContent = match[0];
//             console.log(scriptContent);
        content = content.replace(scriptContent, '');
        var match2 = /\s*src=['"]([^'"]*)['"]/gi.exec(match[1]);
        if(match2) {
            var srcValue = match2[1];
            includeScripts.push(srcValue);

        } else {
            throw new Error("Invalid Script: " + scriptContent);
        }
    }
    return content;
};

if(typeof importScripts !== 'undefined') {

    if (!module) var module = {exports:{}};
    module.exports.Client = Client;
    module.exports.ClientWorkerThread = ClientWorkerThread;

    self.addEventListener('message', function (e) {
        ClientWorkerThread.execute(e.data, e);
    }, false);

    if(typeof Crypto === 'undefined') {
        importScripts('pgp/lib/support/nfcrypto.js');
        Crypto = self.nfCrypto;
    }


    function ClientWorkerThread() {
    }

    (function() {

        var handlerCounter = 0;
        var responseHandlers = [];
        var commandHandlers = [];

        var consoleExports = false;
        Client.log =
        ClientWorkerThread.log = function(message) {
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
                Client.render(html);
            });
//         console.log(message);
        };

        Client.postResponseToClient =
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

        Client.execute =
        ClientWorkerThread.execute = function(commandString, e) {
            var oldCounter = handlerCounter;
            for(var i=0; i<commandHandlers.length; i++)
                if(commandHandlers[i](commandString, e))
                    return (function() {

                        //var parts = commandString.split(' ');
                        //var part1 = parts.shift();
                        //var part2 = parts.join(' ');
                        //Client.log(
                        //    '<span class="direction">$</span> ' +
                        //    '<span class="response">' + part1 + "</span>" + (part2 ? ' ' + part2 : '')
                        //);

                        return true;
                    })();

            if(handlerCounter > oldCounter)
            // Commands were added or removed, so try again
                return ClientWorkerThread.execute(commandString, e);

            var err = "Client Command Handlers (" + commandHandlers.length + ") could not handle: " + commandString;
            Client.log('<span class="error">' + err + '</span>');
            console.error(err, commandHandlers);

            //Client.postResponseToClient("ERROR " + err);
            return false;
        };

        Client.processResponse =
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
                    Client.log(
                        '<span class="direction">I</span> ' +
                        '<span class="response">' + part1 + "</span>" + (part2 ? ' ' + part2 : '')
                    );

                    return true;
                }



            if(handlerCounter > oldCounter)
            // Commands were added or removed, so try again
                return ClientWorkerThread.processResponse(responseString, e);

            var err = "Client Response Handlers could not handle: " + responseString;
            Client.log('<span class="error">' + err + '</span>');
            console.error(err, responseHandlers);

            //Client.postResponseToClient("ERROR " + err);
            return false;
        };

        Client.render =
        ClientWorkerThread.render = function(content, callback) {
            parseClientTags(content, function(parsedContent) {
                ClientWorkerThread.postResponseToClient("RENDER " + parsedContent);
                (callback || function(){})();
            });
        };

        //ClientWorker.appendChild = function(targetClass, childContent) {
        //    //parseClientTags(childContent, function(parsedContent) {
        //        ClientWorker.postResponseToClient("APPEND " + targetClass + " " + childContent);
        //    //});
        //};

        //ClientWorker.prependChild = function(targetClass, childContent) {
        //    //parseClientTags(childContent, function(parsedContent) {
        //        ClientWorker.postResponseToClient("PREPEND " + targetClass + " " + childContent);
        //    //});
        //};

        //ClientWorker.replace = function(targetClass, replaceContent) {
        //    //parseClientTags(replaceContent, function(parsedContent) {
        //        ClientWorker.postResponseToClient("REPLACE " + targetClass + " " + replaceContent);
        //    //});
        //};


        function parseClientTags(tagHTML, callback) {
            var match = /\{([a-z][^}]+)}/.exec(tagHTML);
            if (!match) {
                callback(tagHTML);
                return;
            }

            var tagString = match[0];

            self.module = {exports: {}};
            importScripts('render/tags/client-tag-list.js');
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

        Client.includeScript =
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
        ClientWorkerThread.addResponse(consoleResponse);
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
        ClientWorkerThread.addCommand(channelButtonCommand);
        function channelButtonCommand(commandString, e) {
            if(!/^(minimize|maximize|close|open)/i.test(commandString))
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

    })();


} else if (typeof document !== 'undefined') {


    function ClientMainThread() {
        return ClientMainThread.get();
    }

    (function() {
        var NO_CLASS = '_you_got_no-class';

        document.addEventListener('command', onCommandEvent, false);

        var socketWorker = null;
        ClientMainThread.get = function() {
            if(!socketWorker) {
                socketWorker = new Worker('client.js');
                socketWorker.addEventListener('message', function(e) {
                    ClientMainThread.processResponse(e.data || e.detail);
                }, true);
            }
            return socketWorker;
        };

        Client.execute =
        ClientMainThread.execute = function (commandString) {
            ClientMainThread.get()
                .postMessage(commandString);
        };

        Client.postResponseToClient =
        Client.processResponse =
        ClientMainThread.processResponse = function(responseString) {
            var args = /^\w+/.exec(responseString);
            if(!args)
                throw new Error("Invalid Command: " + responseString);

            var command = args[0].toLowerCase();

            switch(command) {
                case 'render':
                    ClientMainThread.render(responseString);
                    break;

                //case 'replace':
                //case 'append':
                //case 'prepend':
                //    renderClass(responseString);
                //    break;

                case 'minimize':
                case 'maximize':
                case 'close':
                case 'open':
                    renderWindowCommand(responseString);
                    break;

                case 'focus':
                    focusWindowCommand(responseString);
                    break;

                case 'event':
                default:
                    // some responses aren't used by the client, but should be passed through the client anyway
                    //console.error("Unrecognized client-side command: " + responseString);
                    break;
            }

            document.dispatchEvent(new CustomEvent('response:' + command, {
                detail: responseString
            }));


            // If host thread exists,
            if(typeof Host === 'object')
            // Send response to host thread
                Host.processResponse(responseString);
        };


        function onCommandEvent(e) {
            e.preventDefault();
            var commandString = e.detail || e.data;
            ClientMainThread.execute(commandString);
        }

        function focusWindowCommand(responseString) {
            var args = /^(focus)\s+(\S+)$/mi.exec(responseString);
            if(!args)
                throw new Error("Invalid Command: " + responseString);

            var targetClass = args[2];
            var targetElements = document.getElementsByClassName(targetClass);
            if(targetElements.length === 0)
                throw new Error("Class not found: " + targetClass + " - " + responseString);

            var focusedElms = document.getElementsByClassName('focused');
            while(focusedElms.length > 0)
                focusedElms[0].classList.remove('focused');
            var maximizedElms = document.getElementsByClassName('maximized');
            while(maximizedElms.length > 0)
                maximizedElms[0].classList.remove('maximized');

            var targetElement = targetElements[0];
            targetElement.classList.add("focused");

            document.body.scrollTop = targetElement.offsetTop;

            var focusInput = targetElement.querySelector('.focus-input')
                || targetElement.querySelector('input[type=text]')
                || targetElement.querySelector('textarea')
                || targetElement.querySelector('select');
            if(focusInput)
                focusInput.focus();
        }

        Client.render =
        ClientMainThread.render = function(commandString) {
            var args = /^render\s+([\s\S]+)$/mi.exec(commandString);
            if (!args)
                throw new Error("Invalid Command: " + commandString);

            var content = args[1];
            var includeScripts = [];
            content = Client.parseScripts(content, includeScripts);
            content = Client.parseStyleSheets(content, includeScripts);

            var htmlContainer = document.createElement('div');
            htmlContainer.innerHTML = content;
            var contentElements = htmlContainer.children;
            if(contentElements.length === 0) {
                htmlContainer.innerHTML = '<article class="' + NO_CLASS + '">' + content + '</article>';
                contentElements = htmlContainer.children;
                if(contentElements.length === 0)
                    throw new Error("First child missing", console.log(content, htmlContainer));
            }

            var contentElement = contentElements[0];     // First Child
            if(contentElement.classList.length === 0)
                contentElement.classList.add('__no-class');
            var targetClass = contentElement.classList.item(0);

            var targetElements = document.getElementsByClassName(targetClass);
            var targetElement;
            if(targetElements.length === 0) {
                // First Render
                var bodyElm = document.getElementsByTagName('body')[0];

                var insertBefore;
                for(var i=0; i<bodyElm.children.length; i++)
                    if(bodyElm.children[i].nodeName.toLowerCase() === 'article') {
                        insertBefore = bodyElm.children[i];
                        break;
                    }

                if(insertBefore && contentElement.classList.contains('prepend-on-render'))
                    bodyElm.insertBefore(contentElement, insertBefore);
                else
                    bodyElm.appendChild(contentElement);


                if(targetElements.length === 0)
                    throw new Error("Re-render class mismatch: '" + targetClass + "'\n" + content);
                targetElement = targetElements[0];

                // targetElement.scrollIntoView();

            } else {
                // Existing element(s) with same first class name
                for(var ti=0; ti<targetElements.length; ti++) {

                    targetElement = targetElements[ti];
                    if(targetElement.classList.contains('closed'))
                        targetElement.classList.remove('closed');
                    if(targetElement.classList.contains('minimized'))
                        targetElement.classList.remove('minimized');
                    if(contentElement.classList.contains('append-children-on-render')
                        || targetElement.classList.contains('append-children-on-render')) {
                        var contentElementClone = contentElement.cloneNode(true);
                        for(var j=0; j<contentElementClone.children.length; j++)
                            targetElement.appendChild(contentElementClone.children[j]);
                        // targetElement.children[targetElement.children.length-1].scrollIntoView();
                    } else {
                        targetElement.innerHTML = contentElement.innerHTML;
                    }

                    if(contentElement.classList.contains('scroll-into-view-on-render'))
                        targetElement.scrollIntoView();
                }
                targetElement = targetElements[0];
            }

            if(targetElement.classList.contains('focus-on-render')) {
                var focusInput = targetElement.querySelector('.focus-input')
                    || targetElement.querySelector('input[type=text]')
                    || targetElement.querySelector('textarea')
                    || targetElement.querySelector('input[type=password]')
                    || targetElement.querySelector('select');
                if(focusInput)
                    focusInput.focus(); // TODO: set last text position/selection
            }

            // Include scripts after insert:
            ClientMainThread.includeScriptsAsync(targetElement, includeScripts, function() {
                var contentEvent = new CustomEvent('render', {
                    bubbles: true
                });
                targetElement.dispatchEvent(contentEvent);
            });
        };

        function renderWindowCommand(responseString) {
            var args = /^(minimize|maximize|close|open)\s+(\S+)$/mi.exec(responseString);
            if(!args)
                throw new Error("Invalid Command: " + responseString);

            var command = args[1].toLowerCase();
            var targetClass = args[2];
            var targetElements = document.getElementsByClassName(targetClass);
            if(targetElements.length === 0)
                throw new Error("Class not found: " + targetClass + " - " + responseString);

            // var targetElement = targetElements[0];

            var maximizedElms = document.getElementsByClassName('maximized');
            while(maximizedElms.length > 0)
                maximizedElms[0].classList.remove('maximized');
                
            // for(var i=0; i<targetElements.length; i++) {
            var targetElement = targetElements[0];
                
            switch(command) {
                case 'open':
                    targetElement.classList.remove('minimized');
                    targetElement.classList.remove('maximized');
                    targetElement.classList.remove('closed');
                    break;
                case 'close':
                    targetElement.classList.remove('minimized');
                    targetElement.classList.remove('maximized');
                    targetElement.classList.add('closed');
                    break;  
                case 'minimize':
                    targetElement.classList.add('minimized');
                    targetElement.classList.remove('maximized');
                    targetElement.classList.remove('closed');

// TODO
                    // Move to bottom of the list
                    // while(targetElement.nextSibling.nodeType === targetElement.nodeType) 
                    //     targetElement.parentNode.insertBefore(targetElement, targetElement.nextSibling);
                    break; 
                case 'maximize':
                    targetElement.classList.remove('minimized');
                    targetElement.classList.add('maximized');
                    targetElement.classList.remove('closed');
                    
                    // Move to top of the list
                    // while(targetElement.previousSibling.nodeType === targetElement.nodeType) 
                    //    targetElement.parentNode.insertBefore(targetElement, targetElement.previousSibling);
                    break;   
            }



        }

    })();


    ClientMainThread.includeScriptsAsync = function(targetElement, scripts, callback) {
        if(scripts.length > 0) {
            var script = scripts.shift();
            ClientMainThread.includeScript(script, function() {
                ClientMainThread.includeScriptsAsync(targetElement, scripts, callback);
            });

        } else {
            if(callback)
                callback();
        }
    };

    Client.includeScript =
    ClientMainThread.includeScript = function(fileURL, callback) {
        var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(fileURL);
        if(!match)
            throw new Error("Invalid URL: " + fileURL);

        var host = match[4],
            scriptPath = match[5].toLowerCase() || '';
        if(host)
            throw new Error("Only local scripts may be included: " + scriptPath);

        var headElm = document.getElementsByTagName('head')[0];

        var ext = scriptPath.split('.').pop();
        switch(ext.toLowerCase()) {
            case 'js':
                var scriptQuery = headElm.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']');
                if (scriptQuery.length === 0) {
                    var newScript = document.createElement('script');
                    newScript.setAttribute('src', scriptPath);
                    newScript.onload = callback;
                    headElm.appendChild(newScript);
                    // console.log("Including Script: ", newScript);

                    return true;
                }
                break;

            case 'css':
                var linkQuery = headElm.querySelectorAll('link[href=' + scriptPath.replace(/[/.]/g, '\\$&') + ']');
                if (linkQuery.length === 0) {
                    var newLink = document.createElement('link');
                    newLink.setAttribute('href', scriptPath);
                    newLink.setAttribute('rel', 'stylesheet');
                    newLink.setAttribute('type', 'text/css');
                    newLink.onload = callback;
                    headElm.appendChild(newLink);
                    // console.log("Including StyleSheet: ", newScript);

                    return true;
                }
                break;

            default:
                throw new Error("Invalid extension: " + ext);
        }

        if(callback)
            callback();

        return false;
    };

} else {
    throw new Error("Invalid Environment");
}

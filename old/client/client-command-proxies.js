
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Command Proxies

//var proxy['get'] = 'rest.get';
//var proxy['post'] = 'rest.post';


if (!module) var module = {exports:{}};
module.exports.initClientCommands = function(ClientWorkerThread) {



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
            "<span class='command " + command + "'>" + value + "</span>",
            true
        );
        return true;
    }

    ClientWorkerThread.addResponse(consoleResponse);
    //ClientWorkerThread.addCommand(consoleResponse);
    function consoleResponse(responseString, e) {
        var match = /^(console|log|info|error|assert|warn)\s*([\s\S]*)$/i.exec(responseString);
        if(!match)
            return false;

        var command = match[1].toLowerCase();
        var value = match[2];

        var renderWindow = false;

        switch(command) {
            case 'console':
                renderWindow = true;
                value = command;
                break;

            default:
                console[command](value);
                break;
        }
        ClientWorkerThread.log(
            "<span class='direction'>I</span> " +
            "<span class='response " + command + "'>" + value + "</span>",
            renderWindow
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


    // Pass-through Commands
    ClientWorkerThread.addCommand(passToClientCommand);
    ClientWorkerThread.addResponse(passToClientCommand);
    function passToClientCommand(commandString, e) {
        if(!/^(event|replace|append|prepend|minimize|maximize|close|open|toggle)/i.test(commandString))
            return false;

        //console.info("Pass-through: " + commandString);
        ClientWorkerThread.postResponseToClient(commandString);
        return true;
    }



    // Client Render
    ClientWorkerThread.addCommand(clientRenderCommand);
    function clientRenderCommand(commandString, e) {
        if(!/^(render)/i.test(commandString))
            return false;

        parseClientTags(commandString, function(parsedCommandString) {
            ClientWorkerThread.postResponseToClient(parsedCommandString);
        });
        return true;
    }


    /** Proxies **/


    // HTTP Commands
    ClientWorkerThread.addCommand(importHTTPCommands);
    ClientWorkerThread.addResponse(importHTTPCommands);
    function importHTTPCommands(commandString, e) {
        if(!/^(keyspaces?|get|put|patch|head|http|host|feed|messsage|pass)/i.test(commandString))
            return false;
        ClientWorkerThread.removeCommand(importHTTPCommands);
        ClientWorkerThread.removeResponse(importHTTPCommands);
        self.module = {exports: {}};
        importScripts('keyspace/ks-client-commands.js');
        module.exports.initClientKSCommands(ClientWorkerThread);
//         console.info("Loaded: pgp/pgp-client-commands.js");
        return false;
    }

    // PGP Commands
    ClientWorkerThread.addCommand(importPGPCommands);
    function importPGPCommands(commandString, e) {
        if(!/^pgp/i.test(commandString))
            return false;
        ClientWorkerThread.removeCommand(importPGPCommands);
        importScripts('pgp/pgp-client-commands.js');
        module.exports.initClientPGPCommands(ClientWorkerThread);
//         console.info("Loaded: pgp/pgp-client-commands.js");
        return false;
    }

    // Chat/Channel Commands
    ClientWorkerThread.addCommand(importChannelCommands);
    ClientWorkerThread.addResponse(importChannelCommands);
    function importChannelCommands(commandString, e) {
        if(!/^(channels?|join|leave|userlist|chat|audio|video)/i.test(commandString))
            return false;
        ClientWorkerThread.removeCommand(importChannelCommands);
        ClientWorkerThread.removeResponse(importChannelCommands);
        importScripts('channel/channel-client-commands.js');
        module.exports.initClientChannelCommands(ClientWorkerThread);
//         console.info("Loaded: channel/channel-client-commands.js");
        return false;
    }

    // UI Commands
    ClientWorkerThread.addCommand(importClientUICommands);
    ClientWorkerThread.addResponse(importClientUICommands);
    function importClientUICommands(commandString, e) {
        if(!/^(ui|contacts|login|menu|about)/i.test(commandString))
            return false;
        ClientWorkerThread.removeCommand(importClientUICommands);
        ClientWorkerThread.removeResponse(importClientUICommands);
        importScripts('ui/ui-commands.js');
        module.exports.initClientUICommands(ClientWorkerThread);
//         console.info("Loaded: channel/channel-client-commands.js");
        return false;
    }


    // Settings Commands
    ClientWorkerThread.addCommand(importSettingsCommands);
    ClientWorkerThread.addResponse(importSettingsCommands);
    function importSettingsCommands(commandString, e) {
        if(!/^(settings|autorun)/i.test(commandString))
            return false;
        ClientWorkerThread.removeCommand(importSettingsCommands);
        ClientWorkerThread.removeResponse(importSettingsCommands);
        importScripts('client/settings/settings-client-commands.js');
        module.exports.initClientSettingsCommands(ClientWorkerThread);
//         console.info("Loaded: channel/channel-client-commands.js");
        return false;
    }



    // Beta Subscribe Commands
    ClientWorkerThread.addCommand(initBetaClientCommands);
    ClientWorkerThread.addResponse(initBetaClientCommands);
    function initBetaClientCommands(commandString, e) {
        if (!/^beta/i.test(commandString))
            return false;

        ClientWorkerThread.removeCommand(initBetaClientCommands);
        ClientWorkerThread.removeResponse(initBetaClientCommands);

        self.module = {exports: {}};
        importScripts('beta/beta-client-commands.js');
        module.exports.initBetaClientCommands(ClientWorkerThread);
        return false;
    }


    // App Commands

    self.module = {exports: {}};
    importScripts('app/client-app-command-proxies.js');
    self.module.exports.initClientAppCommands(ClientWorkerThread);

};


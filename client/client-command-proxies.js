
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Command Proxies

//var proxy['get'] = 'rest.get';
//var proxy['post'] = 'rest.post';


if (!module) var module = {exports:{}};
module.exports.initClientCommands = function(ClientWorkerThread) {

    // HTTP Commands
    ClientWorkerThread.addCommand(importHTTPCommands);
    ClientWorkerThread.addResponse(importHTTPCommands);
    function importHTTPCommands(commandString, e) {
        if(!/^(keyspace|get|put|patch|head|http|host|feed|contacts)/i.test(commandString))
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
    ClientWorkerThread.addCommand(importChatCommands);
    ClientWorkerThread.addResponse(importChatCommands);
    function importChatCommands(commandString, e) {
        if(!/^(channel|subscribe|unsubscribe|message|chat|nick)/i.test(commandString))
            return false;
        ClientWorkerThread.removeCommand(importChatCommands);
        ClientWorkerThread.removeResponse(importChatCommands);
        importScripts('channel/channel-client-commands.js');
        module.exports.initClientChannelCommands(ClientWorkerThread);
//         console.info("Loaded: channel/channel-client-commands.js");
        return false;
    }

    // App Commands

    self.module = {exports: {}};
    importScripts('app/client-app-command-proxies.js');
    self.module.exports.initClientAppCommands(ClientWorkerThread);

};


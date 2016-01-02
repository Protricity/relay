
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
        if(!/^(channels?|message|chat|audio|video)/i.test(commandString))
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
        if(!/^(ui|contacts)/i.test(commandString))
            return false;
        ClientWorkerThread.removeCommand(importClientUICommands);
        ClientWorkerThread.removeResponse(importClientUICommands);
        importScripts('render/ui/ui-commands.js');
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

    // App Commands

    self.module = {exports: {}};
    importScripts('app/client-app-command-proxies.js');
    self.module.exports.initClientAppCommands(ClientWorkerThread);

};


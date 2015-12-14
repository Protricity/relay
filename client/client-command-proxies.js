
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Command Proxies

//var proxy['get'] = 'rest.get';
//var proxy['post'] = 'rest.post';


if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.initClientCommands = function(ClientWorker) {

    // HTTP Commands
    ClientWorker.addCommand(importHTTPCommands);
    ClientWorker.addResponse(importHTTPCommands);
    function importHTTPCommands(commandString, e) {
        if(!/^(?:keyspace\.)?(get|put|patch|head|http|host|feed|contacts)/i.test(commandString))
            return false;
        ClientWorker.removeCommand(importHTTPCommands);
        ClientWorker.removeResponse(importHTTPCommands);
        self.module = {exports: {}};
        importScripts('keyspace/ks-client-commands.js');
        module.exports.initClientKSCommands(ClientWorker);
//         console.info("Loaded: pgp/pgp-client-commands.js");
        return false;
    }

    // PGP Commands
    ClientWorker.addCommand(importPGPCommands);
    function importPGPCommands(commandString, e) {
        if(!/^pgp/i.test(commandString))
            return false;
        ClientWorker.removeCommand(importPGPCommands);
        importScripts('pgp/pgp-client-commands.js');
        module.exports.initClientPGPCommands(ClientWorker);
//         console.info("Loaded: pgp/pgp-client-commands.js");
        return false;
    }

    // Chat/Channel Commands
    ClientWorker.addCommand(importChatCommands);
    ClientWorker.addResponse(importChatCommands);
    function importChatCommands(commandString, e) {
        if(!/^(?:channel\.)?(autojoin|join|leave|message|chat|nick|userlist|keylist)/i.test(commandString))
            return false;
        ClientWorker.removeCommand(importChatCommands);
        ClientWorker.removeResponse(importChatCommands);
        importScripts('channel/channel-client-commands.js');
        module.exports.initClientChannelCommands(ClientWorker);
//         console.info("Loaded: channel/channel-client-commands.js");
        return false;
    }

    // App Commands

    ClientWorker.require('app/client-app-command-proxies.js')
        .initClientAppCommands(ClientWorker);

};


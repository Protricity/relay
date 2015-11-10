
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Command Proxies

//var proxy['get'] = 'rest.get';
//var proxy['post'] = 'rest.post';


if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.initClientCommands = function(Client) {

    // HTTP Commands
    Client.addCommand(importHTTPCommands);
    Client.addResponse(importHTTPCommands);
    function importHTTPCommands(commandString, e) {
        if(!/^(get|put|patch|head|http|auth|feed)/i.test(commandString))
            return false;
        Client.removeCommand(importHTTPCommands);
        Client.removeResponse(importHTTPCommands);
        self.module = {exports: {}};
        importScripts('ks/ks-client-commands.js');
        module.exports.initClientKSCommands(Client);
//         console.info("Loaded: pgp/pgp-client-commands.js");
        return false;
    }

    // PGP Commands
    Client.addCommand(importPGPCommands);
    function importPGPCommands(commandString, e) {
        if(!/^pgp/i.test(commandString))
            return false;
        Client.removeCommand(importPGPCommands);
        importScripts('pgp/pgp-client-commands.js');
        module.exports.initClientPGPCommands(Client);
//         console.info("Loaded: pgp/pgp-client-commands.js");
        return false;
    }

    // Chat/Channel Commands
    Client.addCommand(importChatCommands);
    Client.addResponse(importChatCommands);
    function importChatCommands(commandString, e) {
        if(!/^(join|leave|message|chat|nick)/i.test(commandString))
            return false;
        Client.removeCommand(importChatCommands);
        Client.removeResponse(importChatCommands);
        importScripts('channel/channel-client-commands.js');
        module.exports.initClientChannelCommands(Client);
//         console.info("Loaded: channel/channel-client-commands.js");
        return false;
    }

    // App Commands

    Client.require('app/client-app-command-proxies.js')
        .initClientAppCommands(Client);

};


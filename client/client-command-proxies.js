if(!exports) var exports = {};
exports.initClientCommands = function(Client) {

    // HTTP Commands
    Client.addCommand(importHTTPCommands);
    Client.addResponse(importHTTPCommands);
    function importHTTPCommands(commandString, e) {
        if(!/^(get|post|put|delete|patch|head|http|ks-\w+)/i.test(commandString))
            return false;
        Client.removeCommand(importHTTPCommands);
        Client.removeResponse(importHTTPCommands);
        importScripts('ks/ks-client-commands.js');
        return false;
    }

    // PGP Commands
    Client.addCommand(importPGPCommands);
    function importPGPCommands(commandString, e) {
        if(!/^(keygen|encrypt|register|unregister|manage|pgp-auth|pgp-auth-validate)/i.test(commandString))
            return false;
        Client.removeCommand(importPGPCommands);
        importScripts('pgp/pgp-client-commands.js');
        return false;
    }

    // App Commands
    Client.require('app/app-client-commands.js')
        .initClientAppCommands(Client);
};


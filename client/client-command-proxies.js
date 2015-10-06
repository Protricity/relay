
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Command Proxies

//var proxy['get'] = 'rest.get';
//var proxy['post'] = 'rest.post';


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
        importScripts('app/ks/ks-client-commands.js');
        return false;
    }

    // Chat Commands
    Client.addCommand(importChatCommands);
    Client.addResponse(importChatCommands);
    function importChatCommands(commandString, e) {
        if(!/^(join|leave|message|chat|nick)/i.test(commandString))
            return false;
        Client.removeCommand(importChatCommands);
        Client.removeResponse(importChatCommands);
        importScripts('app/social/chat/chat-client-commands.js');
        return false;
    }


    // Feed Commands
    Client.addCommand(importFeedCommands);
    function importFeedCommands(commandString, e) {
        if(!/^feed/i.test(commandString))
            return false;
        Client.removeCommand(importFeedCommands);
        importScripts('app/social/feed/feed-client-commands.js');
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

}


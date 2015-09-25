
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Command Proxies

//var proxy['get'] = 'rest.get';
//var proxy['post'] = 'rest.post';

(function() {

    // HTTP Commands
    Client.addCommand(importHTTPCommands);
    Client.addResponse(importHTTPCommands);
    function importHTTPCommands(commandCallback, e) {
        if(!/^(get|post|put|delete|patch|head|http|host-auth|host-auth-validate)/i.test(commandCallback))
            return false;
        Client.removeCommand(importHTTPCommands);
        Client.removeResponse(importHTTPCommands);
        importScripts('http/http-client-commands.js');
    }

    // Chat Commands
    Client.addCommand(importChatCommands);
    Client.addResponse(importChatCommands);
    function importChatCommands(commandCallback, e) {
        if(!/^(join|leave|message|chat|nick)/i.test(commandCallback))
            return false;
        Client.removeCommand(importChatCommands);
        Client.removeResponse(importChatCommands);
        importScripts('chat/chat-client-commands.js');
    }


    // Feed Commands
    Client.addCommand(importFeedCommands);
    function importFeedCommands(commandCallback, e) {
        if(!/^(feed)/i.test(commandCallback))
            return false;
        Client.removeCommand(importFeedCommands);
        importScripts('feed/feed-client-commands.js');
    }

    // PGP Commands
    Client.addCommand(importPGPCommands);
    function importPGPCommands(commandCallback, e) {
        if(!/^(keygen|encrypt|register|unregister|manage|pgp-auth|pgp-auth-validate)/i.test(commandCallback))
            return false;
        Client.removeCommand(importPGPCommands);
        importScripts('pgp/pgp-client-commands.js');
    }

})();



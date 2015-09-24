
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Command Proxies

//var proxy['get'] = 'rest.get';
//var proxy['post'] = 'rest.post';

(function() {

    // HTTP Commands
    Client.addCommand(/^(get|post|put|delete|patch|head|host-auth|host-auth-validate)/i, httpCommand);
    function httpCommand(commandString, e) {
        Client.removeCommand(httpCommand);
        importScripts('http/http-client-commands.js');
        Client.execute(commandString, e);
    }
    Client.addResponse(/^(http)/i, httpResponse);
    function httpResponse(responseString, e) {
        Client.removeCommand(httpResponse);
        importScripts('http/http-client-commands.js');
        Client.processResponse(responseString, e);
    }

    // Chat Commands
    Client.addCommand(/^(join|leave|message|chat|nick)/i, chatCommand);
    function chatCommand(commandString, e) {
        Client.removeCommand(chatCommand);
        importScripts('chat/chat-client-commands.js');
        Client.execute(commandString, e);
    }
    Client.addResponse(/^(join|leave|message|chat|nick)/i, httpResponse);
    function chatResponse(responseString, e) {
        Client.removeCommand(chatResponse);
        importScripts('http/http-client-commands.js');
        Client.processResponse(responseString, e);
    }


    // Feed Commands
    Client.addCommand(/^(feed)/i, chatCommand);
    function feedCommand(commandString, e) {
        Client.removeCommand(feedCommand);
        importScripts('feed/feed-client-commands.js');
        Client.execute(commandString, e);
    }

    // PGP Commands
    Client.addCommand(/^(keygen|encrypt|register|unregister|manage|pgp-auth|pgp-auth-validate)/i, chatCommand);
    function pgpCommand(commandString, e) {
        Client.removeCommand(pgpCommand);
        importScripts('pgp/pgp-client-commands.js');
        Client.execute(commandString, e);
    }

})();



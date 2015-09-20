
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Commands

Commands.add(['info'], function(commandResponse) { console.info(commandResponse); });
Commands.add(['error'], function(commandResponse) { console.error(commandResponse); });
Commands.add(['assert'], function(commandResponse) { console.assert(commandResponse); });
Commands.add(['warn'], function(commandResponse) { console.warn(commandResponse); });


// Window Commands

Commands.add(['minimize', 'maximize', 'close'],
    function(commandResponse) {
    // TODO: custom logic per window
    return CommandResponses.postToClient("LOG." + commandResponse);
});


// Socket Command Proxies

// HTTP Commands
Commands.addProxy(
    ['get', 'post', 'put', 'delete', 'patch', 'head', 'http'],
    'rest/rest-commands.js');

// Chat Commands
Commands.addProxy(
    ['join', 'leave', 'message', 'chat', 'nick'],
    'chat/chat-commands.js');

// Feed Commands
Commands.addProxy(
    ['feed'],
    'feed/feed-commands.js');

// PGP Commands
Commands.addProxy(
    ['keygen', 'encrypt', 'register', 'unregister', 'manage', 'identify'],
    'pgp/pgp-commands.js');
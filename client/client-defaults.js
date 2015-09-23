
//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);

// Socket Client

Client.addResponse('info', function(commandResponse) { console.info(commandResponse); });
Client.addResponse('error', function(commandResponse) { console.error(commandResponse); });
Client.addResponse('assert', function(commandResponse) { console.assert(commandResponse); });
Client.addResponse('warn', function(commandResponse) { console.warn(commandResponse); });


// Window Client

Client.addCommand(['minimize', 'maximize', 'close'],
    function(commandResponse) {
    // TODO: custom logic per window
    return Client.postResponseToClient("LOG." + commandResponse);
});


// Socket Command Proxies

// HTTP Commands
Client.addCommandProxy(
    ['get', 'post', 'put', 'delete', 'patch', 'head', 'http'],
    'rest/rest-client-commands.js');

// Chat Commands
Client.addCommandProxy(
    ['join', 'leave', 'message', 'chat', 'nick'],
    'chat/chat-client-commands.js');

// Feed Commands
Client.addCommandProxy(
    ['feed'],
    'rest/feed/feed-client-commands.js');

// PGP Commands
Client.addCommandProxy(
    ['key', 'keygen', 'encrypt', 'register', 'unregister', 'manage', 'identify', 'idsig'],
    'pgp/pgp-client-commands.js');

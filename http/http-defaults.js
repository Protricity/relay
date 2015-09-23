
if(!exports) var exports = {};
exports.initHTTPServerCommands = function(HTTPServer) {

    // Socket Command Proxies

    // HTTP Commands
    HTTPServer.addCommandProxy(
        ['get123', 'post', 'put', 'delete', 'patch', 'head', 'http'],
        '../rest/rest-http-commands.js');

    HTTPServer.addCommandProxy(
        ['get'],
        './http-commands.js');

    // Feed Commands
    HTTPServer.addCommandProxy(
        ['feed'],
        '../rest/feed/feed-http-commands.js');
};



//var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);

// Socket Client
//
//HTTPServer.addResponse('info', function(commandResponse) { console.info(commandResponse); });
//HTTPServer.addResponse('error', function(commandResponse) { console.error(commandResponse); });
//HTTPServer.addResponse('assert', function(commandResponse) { console.assert(commandResponse); });
//HTTPServer.addResponse('warn', function(commandResponse) { console.warn(commandResponse); });

//// PGP Commands
//HTTPServer.addCommandProxy(
//    ['key', 'keygen', 'encrypt', 'register', 'unregister', 'manage', 'identify', 'idsig'],
//    'pgp/pgp-http-commands.js');

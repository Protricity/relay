//if(typeof _socket_defaults_js === 'undefined') {
//    _socket_defaults_js = true;


var socketDefaultList = [
    'ws://' + location.host + (location.port ? '' : ':8080') + '/relay-server/socket'
    //'ws://relay.co.il:8080/relay-server/socket'
    //'ws://localhost:8080/relay-server/socket'
];


var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);

var socketCommands = {};
var socketResponses = {};
var socketAutoLoaders = {};

// Socket Commands


socketCommands.info = function(commandString) { return self.sendWithFastestSocket(commandString); };
socketResponses.info = function(commandResponse) { return self.routeResponseToClient(commandResponse); };
socketCommands.error = function(commandString) { return self.sendWithFastestSocket(commandString); };
socketResponses.error = function(commandResponse) { return self.routeResponseToClient(commandResponse); };



// HTTP Commands
socketAutoLoaders['http/http-worker.js'] = ['get', 'post', 'put', 'delete', 'patch', 'head'];

// Chat Commands
socketAutoLoaders['chat/chat-worker.js'] = ['join', 'leave', 'message', 'chat'];

// Feed Commands
socketAutoLoaders['feed/feed-worker.js'] = ['feed'];

// PGP Commands
socketAutoLoaders['pgp/pgp-worker.js'] = ['keygen', 'encrypt', 'register', 'unregister', 'manage', 'identify'];

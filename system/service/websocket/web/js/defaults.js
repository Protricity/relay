var defaultSocketList = [
       'ws://relay.co.il:8080/relay-server/socket'
    //'ws://localhost:8080/relay-server/socket'
];

var socketListByPath = [];
//socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


// Socket Commands

self.infoCommand = sendWithFastestSocket;
self.infoResponse = routeResponseToClient;

// Chat Commands

self.joinCommand =
self.leaveCommand =
self.messageCommand =
self.msgCommand =
function(commandString) {
    importScripts('../cmd/chat/chat-worker.js');
    executeCommand(commandString);
};


// Post Commands

self.spostCommand =
self.postCommand =
function(commandString) {
    importScripts('../cmd/post/post-worker.js');
    executeCommand(commandString);
};



// PGP Commands

self.keygenCommand =
self.encryptCommand =
self.registerCommand =
self.manageCommand =
function(commandString) {
    importScripts('../cmd/pgp/pgp-worker.js');
    executeCommand(commandString);
};


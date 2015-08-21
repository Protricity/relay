(function() {

    self.defaultSocketList = [
           //'ws://relay.co.il:8080/relay-server/socket'
        'ws://localhost:8080/relay-server/socket'
    ];


    self.socketListByPath = [];
    //socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


    // Socket Commands

    self.infoCommand = function(commandString) { return self.sendWithFastestSocket(commandString); };
    self.infoResponse = function(commandResponse) { return self.routeResponseToClient(commandResponse); };

    // Chat Commands

    self.joinCommand =
    self.leaveCommand =
    self.messageCommand =
    self.msgCommand =
    function(commandString) {
        importScripts('chat/chat-worker.js');
        self.executeWorkerCommand(commandString);
    };


    // Post Commands

    self.spostCommand =
    self.postCommand =
    self.feedCommand =
    function(commandString) {
        importScripts('feed/feed-worker.js');
        self.executeWorkerCommand(commandString);
    };



    // PGP Commands

    self.keygenCommand =
    self.encryptCommand =
    self.registerCommand =
    self.unregisterCommand =
    self.manageCommand =
    self.identifyCommand =
        function(commandString) {
            importScripts('pgp/pgp-worker.js');
            self.executeWorkerCommand(commandString);
        };

    self.identifyResponse =
        function(responseString) {
            importScripts('pgp/pgp-worker.js');
            self.executeWorkerResponse(responseString);
        };

})();

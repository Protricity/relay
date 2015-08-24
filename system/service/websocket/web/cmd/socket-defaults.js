(function() {

    self.defaultSocketList = [
        'ws://' + self.location.host + (self.location.port ? '' : ':8080') + '/relay-server/socket'
        //'ws://relay.co.il:8080/relay-server/socket'
        //'ws://localhost:8080/relay-server/socket'
    ];


    self.socketListByPath = [];
    //socketListByPath.push([/regex/, ['ws://domain:port/path/to/socket']]);


    // Socket Commands

    self.infoCommand = function(commandString) { return self.sendWithFastestSocket(commandString); };
    self.infoResponse = function(commandResponse) { return self.routeResponseToClient(commandResponse); };
    self.errorCommand = function(commandString) { return self.sendWithFastestSocket(commandString); };
    self.errorResponse = function(commandResponse) { return self.routeResponseToClient(commandResponse); };


    // HTTP Commands

    self.getCommand =
    self.postCommand =
    self.putCommand =
    self.deleteCommand =
    self.patchCommand =
    self.headCommand =
    function(commandString) {
        importScripts('http/http-worker.js');
        self.executeWorkerCommand(commandString);
    };

    // Chat Commands

    self.joinCommand =
    self.leaveCommand =
    self.messageCommand =
    self.msgCommand =
    function(commandString, e) {
        importScripts('chat/chat-worker.js');
        self.executeWorkerCommand(commandString, e);
    };


    // Feed Commands

    self.postCommand = //todo post=>put
    self.feedCommand =
    function(commandString, e) {
        importScripts('feed/feed-worker.js');
        self.executeWorkerCommand(commandString, e);
    };



    // PGP Commands

    self.keygenCommand =
    self.encryptCommand =
    self.registerCommand =
    self.unregisterCommand =
    self.manageCommand =
    self.identifyCommand =
        function(commandString, e) {
            importScripts('pgp/pgp-worker.js');
            self.executeWorkerCommand(commandString, e);
        };

    self.identifyResponse =
    self.idsigResponse =
        function(responseString, e) {
            importScripts('pgp/pgp-worker.js');
            self.executeWorkerResponse(responseString, e);
        };

})();

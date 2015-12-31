/**
 * Created by ari on 9/22/2015.
 */



/**
 * Created by ari on 9/22/2015.
 */

if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.SocketServer = SocketServer;

SocketServer.DEFAULT_PORTS = 7314;

SocketServer.VERSION = 8;
SocketServer.VERSION_STRING = '0.8a';

function SocketServer() {

}

(function() {
    var server = null;
    SocketServer.getServerInstance = function() { return server; };

    //var version = null;
    //SocketServer.getGitRevision = function(callback) {
    //    if(version) {
    //        callback(version);
    //        return;
    //    }
    //
    //    var exec = require('child_process').exec;
    //    var cmd = 'git rev-parse HEAD -C ' + __dirname;
    //
    //    exec(cmd, function(error, stdout, stderr) {
    //        console.log(error, stdout, stderr);
    //        version = stdout;
    //        callback(version);
    //        // command output is in stdout
    //    });
    //};

    SocketServer.startServer = function(port) {
        if(server)
            throw new Error("Socket Server already started");

        port = port || SocketServer.DEFAULT_PORTS;

        var WebSocket = require('ws');
        var WebSocketServer = WebSocket.Server;

        server = new WebSocketServer({port: port});
        server.on('connection', function (client) {
            client.send("SERVER.VERSION " + SocketServer.VERSION + ' ' + SocketServer.VERSION_STRING);
            //SocketServer.getGitRevision(function(revision) {
                //console.info("O GIT.REVISION " + revision);
            //});
            for(var i=0; i<clientEvents.length; i++)
                client.on(clientEvents[i][0], clientEvents[i][1]);

        });

        for(var i=0; i<serverEvents.length; i++)
            server.on(serverEvents[i][0], serverEvents[i][1]);
        serverEvents = null;
        console.log("Socket Server running on port " + port);

    };

    var handlerCounter = 0;
    var clientEvents = [];
    var serverEvents = [];
    var commandHandlers = [];
    //var proxyList = [];
    //var requestHandlers = [];

    clientEvents.push(['message', function(message, flags) {
        //console.log("I " + message);
        try {
            SocketServer.execute(message, this);
        } catch (e) {
            console.error(e.stack);
        }
    }]);

    SocketServer.addEventListener = function(type, listener) {
        handlerCounter++;
        if(server) {
            server.on(type, listener);
            if(type === 'connection')
                server.clients.forEach(listener);

        } else {
            serverEvents.push([type, listener]);
        }
    };

    SocketServer.addClientEventListener = function(type, listener) {
        clientEvents.push([type, listener]);
        handlerCounter++;
    };

    SocketServer.addCommand = function (commandCallback) {
        if(typeof commandCallback !== 'function')
            throw new Error("Invalid Function: " + typeof commandCallback);
        if(commandHandlers.indexOf(commandCallback) >= 0)
            throw new Error("Socket Server Command Callback already added: " + commandCallback);
        commandHandlers.push(commandCallback);
        handlerCounter++;

    };

    SocketServer.removeCommand = function (commandCallback) {
        if(typeof commandCallback !== 'function')
            throw new Error("Invalid Function: " + typeof commandCallback);
        var pos = commandHandlers.indexOf(commandCallback);
        if(pos === -1)
            throw new Error("Socket Server Command Callback not added: " + commandCallback);
        commandHandlers.splice(pos, 1);
        handlerCounter++;
    };

    require('./socket-server-command-proxies.js')
        .initSocketServerCommandProxies(SocketServer);

    SocketServer.execute = function(commandString, client) {
        var oldCounter = handlerCounter;
        for(var i=0; i<commandHandlers.length; i++)
            if(commandHandlers[i](commandString, client) !== false)
                return true;

        if(handlerCounter > oldCounter)
            // Commands were added or removed, so try again
            return SocketServer.execute(commandString, client);
            //for(i=oldLength-1; i<commandHandlers.length; i++)
            //    if(commandHandlers[i](commandString, client) !== false)
            //        return true;

        var err = "Socket Server Command Handlers could not handle: " + commandString;
        client.send("ERROR " + err);
        console.error(err);
        return false;
    };

})();


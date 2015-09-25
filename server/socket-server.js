/**
 * Created by ari on 9/22/2015.
 */



/**
 * Created by ari on 9/22/2015.
 */

if(!exports) var exports = {};
exports.SocketServer = SocketServer;

SocketServer.DEFAULT_PORTS = 7314;

function SocketServer() {

}

(function() {
    var server = null;
    SocketServer.getServerInstance = function() { return server; };

    SocketServer.startServer = function(port) {
        if(server)
            throw new Error("Socket Server already started");

        port = port || SocketServer.DEFAULT_PORTS;

        var WebSocket = require('ws');
        var WebSocketServer = WebSocket.Server;

        server = new WebSocketServer({port: port});
        server.on('connection', function (client) {
            for(var i=0; i<clientEvents.length; i++)
                client.on(clientEvents[i][0], clientEvents[i][1]);
            client.send("GET socket://521D4941.ks/@pgp/@export");

        });

        for(var i=0; i<serverEvents.length; i++)
            server.on(serverEvents[i][0], serverEvents[i][1]);
        serverEvents = null;
        console.log("Socket Server running on port " + port);

    };

    var clientEvents = [];
    var serverEvents = [];
    var commandHandlers = [];
    //var proxyList = [];
    //var requestHandlers = [];

    clientEvents.push(['message', function(message) {
        console.log("I " + message);
        SocketServer.execute(message, this);
    }]);

    SocketServer.addEventListener = function(type, listener) {
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
    };

    SocketServer.addCommand = function (commandCallback) {
        if(commandHandlers.indexOf(commandCallback) >= 0)
            throw new Error("Socket Server Command Callback already added: " + commandCallback);
        commandHandlers.push(commandCallback);
    };

    SocketServer.removeCommand = function (commandCallback) {
        var pos = commandHandlers.indexOf(commandCallback);
        if(pos === -1)
            throw new Error("Socket Server Command Callback not added: " + commandCallback);
        commandHandlers.splice(pos, 1);
    };

    require('./socket-server-command-proxies.js')
        .initSocketServerCommandProxies(SocketServer);

    SocketServer.execute = function(commandString, client) {
        var oldLength = commandHandlers.length;
        for(var i=0; i<oldLength; i++)
            if(commandHandlers[i](commandString, client) !== false)
                return true;

        if(commandHandlers.length > oldLength)
            for(i=oldLength-1; i<commandHandlers.length; i++)
                if(commandHandlers[i](commandString, client) !== false)
                    return true;

        var err = "Socket Server Command Handlers (" + commandHandlers.length + ">" + oldLength + ") could not handle: " + commandString;
        client.send("ERROR " + err);
        console.error(err);
        return false;
    };


})();


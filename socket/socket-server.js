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

        var WebSocketServer = require('ws').Server;
        server = new WebSocketServer({port: port});
        server.on('connection', function (client) {
            for(var i=0; i<clientEvents.length; i++)
                client.on(clientEvents[i][0], clientEvents[i][1]);
        });
        console.log("Socket Server running on port " + port);

    };

    var clientEvents = [];
    var commandList = [];
    var proxyList = [];

    clientEvents.push(['message', function(message) {
        SocketServer.execute(this, message);
    }]);

    // TODO: comes in too late for not-yet-loaded stuffs
    SocketServer.addEventListener = function(type, listener) {
        server.on(type, listener);
    };

    SocketServer.addClientEventListener = function(type, listener) {
        clientEvents.push([type, listener]);
    };

    SocketServer.addCommand = function (commandPrefix, commandCallback) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                SocketServer.addCommand(commandPrefix[i], commandCallback);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            commandList.push([commandPrefix, commandCallback]);
        }
    };

    SocketServer.addCommandProxy = function (commandPrefix, scriptPath) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                SocketServer.addCommandProxy(commandPrefix[i], scriptPath);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            proxyList.push([commandPrefix, scriptPath]);
        }
    };

    //require('./socket-server-defaults.js')
    //    .initSocketServerCommands(SocketServer);

    SocketServer.execute = function(client, commandString) {
        for(var i=0; i<commandList.length; i++) {
            if(commandList[i][0].test(commandString)) {
                return commandList[i][1](client, commandString);
            }
        }
        if(tryProxy(commandString)) {
            for(i=0; i<commandList.length; i++) {
                if(commandList[i][0].test(commandString)) {
                    return commandList[i][1](client, commandString);
                }
            }
        }
        throw new Error("Command Handler failed to load: " + commandString);
    };


    //SocketServer.sendWithSocket = function(commandString, withSocket) {
    //    if(typeof Sockets === 'undefined')
    //        importScripts('sockets/sockets.js');
    //    return Sockets.send(commandString, withSocket);
    //};

    //SocketServer.postResponseToClient = function(responseString) {
    //    replaceAllTags(responseString, function(parsedResponseString) {
    //        self.postMessage(parsedResponseString);
    //    });
    //};

    function tryProxy(contentString) {
        for(var j=0; j<proxyList.length; j++) {
            var proxyRegex = proxyList[j][0];
            if(proxyRegex.test(contentString)) {
                var proxyScript = proxyList[j][1];
                var oldLength = commandList.length;
                require(proxyScript)
                    .initSocketServerCommands(SocketServer);
                if(commandList.length === oldLength)
                    throw new Error("Imported script failed to add any new commands: " + proxyScript);
                return true;
            }
        }
        return false;
    }




    // Socket Command Proxies

    // HTTP Commands
    SocketServer.addCommandProxy(
        ['get', 'post', 'put', 'delete', 'patch', 'head', 'http'],
        '../rest/rest-socket-commands.js');

    // Chat Commands
    SocketServer.addCommandProxy(
        ['join', 'leave', 'message', 'chat', 'nick'],
        '../chat/chat-socket-commands.js');


    // PGP Commands
    SocketServer.addCommandProxy(
        ['identify', 'idsig'],
        '../pgp/pgp-socket-commands.js');


})();


/**
 * Created by ari on 9/22/2015.
 */



/**
 * Created by ari on 9/22/2015.
 */

if(!exports) var exports = {};
exports.SocketServer = SocketServer;

SocketServer.DEFAULT_PORT = 8080;

function SocketServer() {

}

(function() {
    var server = null;
    SocketServer.getServerInstance = function() { return server; };

    SocketServer.startServer = function(port) {
        if(server)
            throw new Error("Socket Server already started");

        port = port || SocketServer.DEFAULT_PORT;

        var WebSocketServer = require('ws').Server;
        server = new WebSocketServer({port: port});
        server.on('connection', function (client) {
            client.server = server;
            client.on('message', function (message) {
                //console.log('received: %s', message);
                SocketServer.execute(client, message);
            });
            //client.send('something');
        });
        console.log("Socket Server running on port " + port);

    };


    var commandList = [];
    var proxyList = [];

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

    require('./socket-server-defaults.js')
        .initSocketServerCommands(SocketServer);

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

})();


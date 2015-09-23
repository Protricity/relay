/**
 * Created by ari on 9/22/2015.
 */

if(!exports) var exports = {};
exports.HTTPServer = HTTPServer;

HTTPServer.DEFAULT_PORTS = '8080,80,7315';

function HTTPServer() {

}

(function() {
    var servers = [];
    //HTTPServer.getServerInstance = function() { return server; };

    HTTPServer.startServer = function(ports) {
        if(servers.length > 0)
            throw new Error("HTTP Server already started");

        ports = ports || HTTPServer.DEFAULT_PORTS;
        var http = require('http');
        ports.replace(/\d+/g, function(port) {
            var server = http.createServer(HTTPServer.execute);
            server.listen(parseInt(port));
            servers.push(server);
            console.log('HTTP Server running on port ' + port);
        });
    };



    var commandList = [];
    var proxyList = [];

    HTTPServer.addCommand = function (commandPrefix, commandCallback) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                HTTPServer.addCommand(commandPrefix[i], commandCallback);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            commandList.push([commandPrefix, commandCallback]);
        }
    };

    HTTPServer.addCommandProxy = function (commandPrefix, scriptPath) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                HTTPServer.addCommandProxy(commandPrefix[i], scriptPath);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            proxyList.push([commandPrefix, scriptPath]);
        }
    };


    //require('./http-defaults.js').initHTTPServerCommands(HTTPServer);

    HTTPServer.execute = function(request, response) {
        var commandString = request.method + ' ' + request.url;
        for(var i=0; i<commandList.length; i++) {
            if(commandList[i][0].test(commandString)) {
                return commandList[i][1](request, response);
            }
        }
        if(tryProxy(commandString)) {
            for(i=0; i<commandList.length; i++) {
                if(commandList[i][0].test(commandString)) {
                    return commandList[i][1](request, response);
                }
            }
        }
        throw new Error("Command Handler failed to load: " + commandString);
    };


    //HTTPServer.sendWithSocket = function(commandString, withSocket) {
    //    if(typeof Sockets === 'undefined')
    //        importScripts('sockets/sockets.js');
    //    return Sockets.send(commandString, withSocket);
    //};

    //HTTPServer.postResponseToClient = function(responseString) {
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
                require(proxyScript).initHTTPServerCommands(HTTPServer);
                if(commandList.length === oldLength)
                    throw new Error("Imported script failed to add any new commands: " + proxyScript);
                return true;
            }
        }
        return false;
    }


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



})();


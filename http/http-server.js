/**
 * Created by ari on 9/22/2015.
 */

if(!exports) var exports = {};
exports.HTTPServer = HTTPServer;

HTTPServer.DEFAULT_PORT = 80;

function HTTPServer() {

}

(function() {
    var server = null;
    HTTPServer.getServerInstance = function() { return server; };

    HTTPServer.startServer = function(port) {
        if(server)
            throw new Error("HTTP Server already started");

        port = port || HTTPServer.DEFAULT_PORT;
        var http = require('http');
        server = http
            .createServer(HTTPServer.execute)
            .listen(port);
        console.log('HTTP Server running on port ' + port);
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

    require('./http-defaults.js').initHTTPServerCommands(HTTPServer);

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

})();


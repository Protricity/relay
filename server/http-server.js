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



    var commandHandlers = [];
    //var proxyList = [];
    //var requestHandlers = [];

    HTTPServer.addCommand = function (commandPrefix, requestHandler) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                HTTPServer.addCommand(commandPrefix[i], requestHandler);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            commandHandlers.push([commandPrefix, requestHandler]);
        }
    };

    HTTPServer.removeCommand = function (commandCallback) {
        for(var i=0; i<commandHandlers.length; i++) {
            if(commandHandlers[i][1] === commandCallback) {
                commandHandlers.splice(i, 1);
                return;
            }
        }
        throw new Error("Callback not found");
    };

    require('./http-server-command-proxies.js')
        .initHTTPServerCommandProxies(HTTPServer);

    //require('./http-defaults.js').initHTTPServerCommands(HTTPServer);

    HTTPServer.execute = function(request, response) {
        var commandString = request.method + ' ' + request.url;
        for(var i=0; i<commandHandlers.length; i++) {
            if (commandHandlers[i][0].test(commandString)) {
                return commandHandlers[i][1](request, response);
            }
        }

        //if(tryProxy(commandString)) {
        //    for(i=0; i<commandHandler.length; i++) {
        //        if(commandHandler[i][0].test(commandString)) {
        //            return commandHandler[i][1](request, response);
        //        }
        //    }
        //}
        throw new Error("Command Handler failed to load: " + commandString);
    };


    // HTTP Commands
    //var processHTTPRequest = null;
    //HTTPServer.addCommand(
    //    ['get', 'post', 'put', 'delete', 'patch', 'head', 'http'],
    //    function(request, response) {
    //        if(!processHTTPRequest)
    //            processHTTPRequest = require('server/server-commands.js').processHTTPRequest;
    //        return processHTTPRequest(request, response);
    //    }
    //);

    //// Feed Commands
    //HTTPServer.addCommandProxy(
    //    ['feed'],
    //    'rest/feed/feed-server-commands.js');
    //


})();


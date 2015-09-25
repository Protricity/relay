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

    HTTPServer.addCommand = function (commandCallback) {
        if(commandHandlers.indexOf(commandCallback) >= 0)
            throw new Error("Callback already added: " + commandCallback);
        commandHandlers.push(commandCallback);
    };

    HTTPServer.removeCommand = function (commandCallback) {
        var pos = commandHandlers.indexOf(commandCallback);
        if(pos === -1)
            throw new Error("Command Callback not added: " + commandCallback);
        commandHandlers.splice(pos, 1);
    };

    require('./http-server-command-proxies.js')
        .initHTTPServerCommandProxies(HTTPServer);

    //require('./http-defaults.js').initHTTPServerCommands(HTTPServer);

    HTTPServer.execute = function(request, response) {
        var commandString = request.method + ' ' + request.url;

        var oldLength = commandHandlers.length;
        for(var i=commandHandlers.length-1; i>=0; i--)
            if(commandHandlers[i](request, response))
                return true;

        if(commandHandlers.length > oldLength) {
            return HTTPServer.execute(request, response);

        } else {
            var err = "Server Command Handlers (" + commandHandlers.length + ") could not handle: " + commandString;
            response.writeHead(400, "Command Failed");
            response.end(err);
            console.error(err);
            return false;
        }
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


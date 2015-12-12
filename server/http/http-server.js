/**
 * Created by ari on 9/22/2015.
 */

if (!module) var module = {exports:{}};
module.exports.HTTPServer = HTTPServer;

HTTPServer.DEFAULT_PORTS = '8080,80,7315';
HTTPServer.VERSION = 1;
HTTPServer.VERSION_STRING = '0.1a';


function HTTPServer() {

}

(function() {
    var servers = [];
    //HTTPServer.getServerInstance = function() { return server; };

    HTTPServer.startServer = function(ports) {
        if(servers.length > 0)
            throw new Error("HTTP Server already started");

        ports = (ports || HTTPServer.DEFAULT_PORTS).toString();
        var http = require('http');
        ports.replace(/\d+/g, function(port) {
            try {
                var server = http.createServer(HTTPServer.execute);
                server.listen(parseInt(port));
                servers.push(server);
                console.log('HTTP Server running on port ' + port);

            } catch (e) {
                console.error(e);
            }
        });

        if(servers.length === 0)
            throw new Error("Server failed");
    };


    var handlerCounter = 0;
    var commandHandlers = [];
    //var proxyList = [];
    //var requestHandlers = [];

    HTTPServer.addCommand = function (commandCallback) {
        if(commandHandlers.indexOf(commandCallback) >= 0)
            throw new Error("HTTP Server Command Callback already added: " + commandCallback);
        commandHandlers.push(commandCallback);
        handlerCounter++;
    };

    HTTPServer.removeCommand = function (commandCallback) {
        var pos = commandHandlers.indexOf(commandCallback);
        if(pos === -1)
            throw new Error("HTTP Server Command Callback not added: " + commandCallback);
        commandHandlers.splice(pos, 1);
        handlerCounter++;
    };

    require('./http-commands.js')
        .initHTTPServerCommands(HTTPServer);

    //require('./http-defaults.js').initHTTPServerCommands(HTTPServer);

    HTTPServer.execute = function(request, response) {
        var oldCounter = handlerCounter;
        for(var i=0; i<commandHandlers.length; i++)
            if(commandHandlers[i](request, response))
                return true;

        if(handlerCounter > oldCounter)
            // Commands were added or removed, so try again
            return HTTPServer.execute(request, response);
            //for(i=oldLength; i<commandHandlers.length; i++)
            //    if(commandHandlers[i](request, response) === true)
            //        return true;

        var err = "HTTP Server Command Handlers could not handle: " + request.method + ' ' + request.url;
        response.writeHead(400, "Command Failed");
        response.end(err);
        console.error(err);
        return false;
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
    //    'keyspace/feed/feed-server-commands.js');
    //


})();


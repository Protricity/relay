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



    var commandHandler = [];
    //var proxyList = [];
    //var requestHandlers = [];

    HTTPServer.addCommand = function (commandPrefix, requestHandler) {
        if(commandPrefix instanceof Array) {
            for(var i=0; i<commandPrefix.length; i++)
                HTTPServer.addCommand(commandPrefix[i], requestHandler);

        } else {
            if(!(commandPrefix instanceof RegExp))
                commandPrefix = new RegExp('^' + commandPrefix, 'i');
            commandHandler.push([commandPrefix, requestHandler]);
        }
    };

    require('./http-server-command-proxies.js')
        .initHTTPServerCommandProxies(HTTPServer);

    //require('./http-defaults.js').initHTTPServerCommands(HTTPServer);

    HTTPServer.execute = function(request, response) {
        var commandString = request.method + ' ' + request.url;
        for(var i=0; i<commandHandler.length; i++) {
            if(commandHandler[i][0].test(commandString)) {
                return commandHandler[i][1](request, response);
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


    function handleURIRequest(request, response) {
        //
        //for(var j=0; j<requestHandlers.length; j++) {
        //    var uriPrefix = requestHandlers[j][0];
        //    if(!uriPrefix.test(request.uri))
        //        continue;
        //
        //    var requestHandler = requestHandlers[j][1];
        //    requestHandler(request, function(responseBody, statusCode, statusMessage, headers) {
        //        response.writeHead(statusCode || 200, statusMessage || 'OK', headers);
        //        response.end(responseBody);
        //    });
        //    return true;
        //}

        var fs = require('fs');

        var filePath = '.' + request.url;
        if (filePath == './')
            filePath = './index.html';

        var contentType = getContentType(filePath);

        fs.readFile(filePath, function (error, content) {
            if (error) {
                if (error.code == 'ENOENT') {
                    fs.readFile('./404.html', function (error, content) {
                        response.writeHead(200, {'Content-Type': contentType});
                        response.end(content, 'utf-8');
                    });
                }
                else {
                    response.writeHead(500);
                    response.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
                    response.end();
                }
            }
            else {
                response.writeHead(200, {'Content-Type': contentType});
                response.end(content, 'utf-8');
            }
        });
    }


    function getContentType(filePath) {
        var extname = filePath.split('?')[0].split('.').pop().toLowerCase();
        switch (extname) {
            case 'htm':
            case 'html':
                return 'text/html';
            case 'js':
                return 'text/javascript';
            case 'css':
                return 'text/css';
            case 'json':
                return 'application/json';
            case 'png':
                return 'image/png';
            case 'jpg':
                return 'image/jpg';
            case 'wav':
                return 'audio/wav';
            default:
                console.error("Unknown file type: " + filePath);
                return 'application/octet-stream';
        }
    }

    //
    //function tryProxy(contentString) {
    //    for(var j=0; j<proxyList.length; j++) {
    //        var proxyRegex = proxyList[j][0];
    //        if(proxyRegex.test(contentString)) {
    //            var proxyScript = proxyList[j][1];
    //            var oldLength = commandHandler.length;
    //            require('../' + proxyScript)
    //                .initHTTPServerCommands(HTTPServer);
    //            if(commandHandler.length === oldLength)
    //                throw new Error("Imported script failed to add any new commands: " + proxyScript);
    //            return true;
    //        }
    //    }
    //    return false;
    //}

    // TODO: move to http-server-commands.js
    HTTPServer.addCommand('get', handleURIRequest);


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


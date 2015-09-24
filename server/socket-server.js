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
        });

        for(var i=0; i<serverEvents.length; i++)
            server.on(serverEvents[i][0], serverEvents[i][1]);
        serverEvents = null;
        console.log("Socket Server running on port " + port);

    };

    var clientEvents = [];
    var serverEvents = [];
    var commandList = [];
    //var proxyList = [];
    //var requestHandlers = [];

    clientEvents.push(['message', function(message) {
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

    SocketServer.addCommand = function (commandPrefix, commandCallback) {
        if(!(commandPrefix instanceof RegExp))
            commandPrefix = new RegExp('^' + commandPrefix, 'i');
        commandList.push([commandPrefix, commandCallback]);
    };


    require('./socket-server-command-proxies.js')
        .initSocketServerCommandProxies(SocketServer);

    SocketServer.execute = function(commandString, client) {
        for(var i=0; i<commandList.length; i++) {
            if(commandList[i][0].test(commandString)) {
                return commandList[i][1](commandString, client);
            }
        }
        throw new Error("Command Handler failed to load: " + commandString);
    };



    function handleURIRequest(commandString, client) {
        var request = parseRequestBody(commandString);

        //for(var j=0; j<requestHandlers.length; j++) {
        //    var uriPrefix = requestHandlers[j][0];
        //    if(!uriPrefix.test(request.uri))
        //        continue;
        //
        //    var requestHandler = requestHandlers[j][1];
        //    requestHandler(commandString, function(responseBody, statusCode, statusMessage, headers) {
        //        client.send('HTTP/1.1 ' + (statusCode || 200) + (statusMessage || 'OK') +
        //            (headers ? "\n" + headers : ''),
        //            "\n\n" + responseBody
        //        );
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

    function parseRequestBody(requestText) {
        var headers = requestText.split(/\n/);
        var firstLine = headers.shift();
        var headerValues = {};
        for(var i=0; i<headers.length; i++) {
            var splitHeader = headers[i].split(': ');
            headerValues[splitHeader[0].toLowerCase()] = splitHeader.length > 0 ? splitHeader[1] : true;
        }
        var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/i.exec(firstLine);
        if(!match)
            throw new Error("Invalid GET Request: " + requestText);
        return {
            method: 'GET',
            url: match[1],
            http_version: match[2] || 'HTTP/1.1',
            headers: headerValues
        };
    }

    // HTTP Commands
    SocketServer.addCommand('get', handleURIRequest);

    //require('../pgp/pgp-socket-commands.js')
    //    .initSocketServerCommands(SocketServer);

})();


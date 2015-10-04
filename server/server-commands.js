/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initSocketServerCommands = function(SocketServer) {
    //SocketServer.addCommand(getStaticSocketCommand);
    // TODO: allow file requests here?
};

exports.initHTTPServerCommands = function(HTTPServer) {
    HTTPServer.addCommand(getStaticHTTPCommand);
};

function getStaticHTTPCommand(request, response) {
    if(request.method.toLowerCase() !== 'get')
        return false;

    // Allow KS requests here?
    console.log(request.method, request.url);
    handleFileRequest(request.url, function(responseBody, statusCode, statusMessage, headers) {
        response.writeHead(statusCode || 200, statusMessage || 'OK', headers);
        response.end(responseBody);
    });
    return true;
}

function getStaticSocketCommand(commandString, client) {
    var match = /^get\s+([\S\s]+)$/im.exec(commandString);
    if(!match)
        return false;

    var requestURL = match[1];
    handleFileRequest(requestURL, function(responseBody, statusCode, statusMessage, headers) {
        client.send('HTTP/1.1 ' + (statusCode || 200) + (statusMessage || 'OK') +
            (headers ? "\n" + headers : ''),
            "\n\n" + responseBody
        );
    });
}

function handleFileRequest(requestURI, responseCallback) {
    var fs = require('fs');

    var filePath = '.' + requestURI;
    if (filePath == './')
        filePath = './index.html';

    var contentType = getContentType(filePath);

    fs.readFile(filePath, function (error, content) {
        if (error) {
            if (error.code == 'ENOENT') {
                fs.readFile('./404.html', function (error, content) {
                    responseCallback(content, 404, 'NOT FOUND', {
                        'Content-Type': contentType
                    });
                });
            }
            else {
                responseCallback('Sorry, check with the site admin for error: ' + error.code + ' ..\n', 500, 'ERR', {
                    'Content-Type': contentType
                });
            }
        }
        else {
            responseCallback(content, 200, 'OK', {
                'Content-Type': contentType
            });
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

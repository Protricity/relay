/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initHTTPServerCommands = function(HTTPServer) {
    HTTPServer.addCommand('get', function (request, response) {
        console.log(request.method, request.url);

        var fs = require('fs');

        var filePath = '.' + request.url;
        if (filePath == './')
            filePath = './index.html';

        var extname = filePath.split('?')[0].split('.').pop().toLowerCase();
        var contentType = 'application/octet-stream';
        switch (extname) {
            case 'htm':
            case 'html':
                contentType = 'text/html';
                break;
            case 'js':
                contentType = 'text/javascript';
                break;
            case 'css':
                contentType = 'text/css';
                break;
            case 'json':
                contentType = 'application/json';
                break;
            case 'png':
                contentType = 'image/png';
                break;
            case 'jpg':
                contentType = 'image/jpg';
                break;
            case 'wav':
                contentType = 'audio/wav';
                break;
            default:
                console.error("Unknown file type: " + filePath);
        }

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

    });


};
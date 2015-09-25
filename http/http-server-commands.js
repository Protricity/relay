/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initSocketServerCommands = function(SocketServer) {
    SocketServer.addCommand(function (commandString, client) {
        var match = /^get\s+([\S\s]+)$/im.exec(commandString);
        if(!match)
            return false;

        return false;
    });
};

exports.initHTTPServerCommands = function(HTTPServer) {
    HTTPServer.addCommand(function (request, response) {
        if(request.method.toLowerCase() !== 'get')
            return false;

        return false;
    });
};
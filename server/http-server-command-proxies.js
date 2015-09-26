/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initHTTPServerCommandProxies = function(HTTPServer) {

    // HTTP Commands
    HTTPServer.addCommand(httpCommand);
    function httpCommand(request, response) {
        if(!/(get|post|put|delete|patch|head|http)/i.test(request.method))
            return false;
        HTTPServer.removeCommand(httpCommand);
        require('../server/server-commands.js')
            .initHTTPServerCommands(HTTPServer);
        require('../ks/ks-server-commands.js')
            .initHTTPServerCommands(HTTPServer);
        return false;
    }

    //// Chat Commands
    //HTTPServer.addCommand(/^(join|leave|message|chat|nick)/i, chatCommand);
    //function chatCommand(commandString, client) {
    //    HTTPServer.removeCommand(chatCommand);
    //    require('../chat/chat-server-commands.js')
    //        .initSocketCommands(HTTPServer);
    //    HTTPServer.execute(commandString, client);
    //}

    // PGP Commands
    HTTPServer.addCommand(pgpCommand);
    function pgpCommand(request, response) {
        if(!/^get @pgp/i.test(request.method + ' ' + request.url))
            return false;
        HTTPServer.removeCommand(pgpCommand);
        require('../pgp/pgp-server-commands.js')
            .initHTTPServerCommands(HTTPServer);
        return false;
    }

};

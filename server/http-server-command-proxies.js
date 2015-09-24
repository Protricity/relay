/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initHTTPServerCommandProxies = function(HTTPServer) {
    // Socket Command Proxies



    // HTTP Commands
    HTTPServer.addCommand(/^(get|post|put|delete|patch|head|http|host-auth|host-auth-validate)/i, httpCommand);
    function httpCommand(request, response) {

        HTTPServer.removeCommand(httpCommand);
        require('../server/server-commands.js')
            .initHTTPServerCommands(HTTPServer);
        HTTPServer.execute(request, response);
    }
    //
    //// Chat Commands
    //HTTPServer.addCommand(/^(join|leave|message|chat|nick)/i, chatCommand);
    //function chatCommand(commandString, client) {
    //    HTTPServer.removeCommand(chatCommand);
    //    require('../chat/chat-server-commands.js')
    //        .initSocketCommands(HTTPServer);
    //    HTTPServer.execute(commandString, client);
    //}

    // PGP Commands
    HTTPServer.addCommand(/^(get @pgp)/i, pgpCommand);
    function pgpCommand(commandString, client) {
        HTTPServer.removeCommand(pgpCommand);
        require('../pgp/pgp-server-commands.js')
            .initHTTPServerCommands(HTTPServer);
        HTTPServer.execute(commandString, client);
    }

};

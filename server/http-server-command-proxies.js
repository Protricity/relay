/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initHTTPServerCommandProxies = function(HTTPServer) {
    // Socket Command Proxies



    // HTTP Commands
    HTTPServer.addCommand(/^(get|post|put|delete|patch|head|http|host-auth|host-auth-validate)/i, httpCommand);
    function httpCommand(commandString, client) {
        HTTPServer.removeCommand(httpCommand);
        require('../http/http-server-commands.js')
            .initSocketCommands(HTTPServer);
        HTTPServer.execute(commandString, client);
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
    HTTPServer.addCommand(/^(get @pgp)/i, chatCommand);
    function pgpCommand(commandString, client) {
        HTTPServer.removeCommand(pgpCommand);
        require('../pgp/pgp-server-commands.js')
            .initSocketCommands(HTTPServer);
        HTTPServer.execute(commandString, client);
    }

};

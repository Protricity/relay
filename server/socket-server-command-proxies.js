/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initSocketServerCommandProxies = function(SocketServer) {
    // Socket Command Proxies

    // HTTP Commands
    SocketServer.addCommand(/^(get|post|put|delete|patch|head|http|host-auth|host-auth-validate)/i, httpCommand);
    function httpCommand(commandString, client) {
        SocketServer.removeCommand(httpCommand);
        require('../http/server-commands.js')
            .initSocketCommands(SocketServer);
        SocketServer.execute(commandString, client);
    }

    // Chat Commands
    SocketServer.addCommand(/^(join|leave|message|chat|nick)/i, chatCommand);
    function chatCommand(commandString, client) {
        SocketServer.removeCommand(chatCommand);
        require('../chat/chat-socket-commands.js')
            .initSocketCommands(SocketServer);
        SocketServer.execute(commandString, client);
    }

    // PGP Commands
    SocketServer.addCommand(/^(pgp-auth|pgp-auth-validate|get @pgp)/i, pgpCommand);
    function pgpCommand(commandString, client) {
        SocketServer.removeCommand(pgpCommand);
        require('../pgp/pgp-socket-commands.js')
            .initSocketCommands(SocketServer);
        SocketServer.execute(commandString, client);
    }

};

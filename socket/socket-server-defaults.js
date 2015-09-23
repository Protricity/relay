/**
 * Created by ari on 9/19/2015.
 */


if(!exports) var exports = {};
exports.initSocketServerCommands = function(SocketServer) {

    // Socket Command Proxies

    // HTTP Commands
    SocketServer.addCommandProxy(
        ['get', 'post', 'put', 'delete', 'patch', 'head', 'http'],
        '../rest/rest-socket-commands.js');

    // Chat Commands
    SocketServer.addCommandProxy(
        ['join', 'leave', 'message', 'chat', 'nick'],
        '../chat/chat-socket-commands.js');

};

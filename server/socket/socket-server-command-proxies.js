/**
 * Created by ari on 9/22/2015.
 */
if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.initSocketServerCommandProxies = function(SocketServer) {
    // Socket Command Proxies

    // HTTP Commands
    //SocketServer.addEventListener('connection', function(client) {
    //    httpCommand("GET", client);
    //});
    SocketServer.addCommand(httpCommand);
    function httpCommand(commandString, client) {
        if(!/^(get|post|put|delete|patch|head|http|auth)/i.test(commandString))
            return false;
        SocketServer.removeCommand(httpCommand);

        //require('../server/server-commands.js')
        //    .initSocketServerCommands(SocketServer);
        //console.log("Loaded server/server-commands.js");

        require('../../ks/ks-server-commands.js')
            .initSocketServerKSCommands(SocketServer);
        console.log("Loaded ks/ks-server-commands.js");

        return false;
    }

    // Chat Commands
    SocketServer.addCommand(chatCommand);
    function chatCommand(commandString, client) {
        if(!/^(join|leave|message|chat|nick)/i.test(commandString))
            return false;
        SocketServer.removeCommand(chatCommand);

        require('../../channel/channel-server-commands.js')
            .initSocketServerChannelCommands(SocketServer);
        console.log("Loaded channel/channel-server-commands.js");

        return false;
    }

    // PGP Commands
    //SocketServer.addCommand(pgpCommand);
    //function pgpCommand(commandString, client) {
    //    if(!/^(pgp-auth|pgp-auth-validate)/i.test(commandString))
    //        return false;
    //    SocketServer.removeCommand(pgpCommand);
    //    require('../pgp/pgp-server-commands.js')
    //        .initSocketServerCommands(SocketServer);
    //    console.log("Loaded pgp/pgp-server-commands.js");
    //    return false;
    //}

};

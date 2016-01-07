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
    SocketServer.addCommand(importHTTPCommands);
    function importHTTPCommands(commandString, client) {
        if(!/^(keyspaces?|get|post|put|delete|patch|head|http|host|message)/i.test(commandString))
            return false;
        SocketServer.removeCommand(importHTTPCommands);
        require('../../keyspace/ks-server-commands.js')
            .initSocketServerKSCommands(SocketServer);
        console.log("Loaded keyspace/ks-server-commands.js");

        return false;
    }

    // Channel Commands
    SocketServer.addCommand(importChannelCommands);
    function importChannelCommands(commandString, client) {
        if(!/^(subscribe|channels?|join|leave|channel|nick|userlist)/i.test(commandString))
            return false;
        SocketServer.removeCommand(importChannelCommands);

        require('../../channel/channel-server-commands.js')
            .initSocketServerChannelCommands(SocketServer);
        console.log("Loaded channel/channel-server-commands.js");

        return false;
    }

    // Server Commands
    SocketServer.addCommand(importClientCommands);
    function importClientCommands(commandString, client) {
        if(!/^client\s*(.*)$/i.test(commandString))
            return false;
            
        // TODO: Handle client command/version
        console.log("Client Command: ", commandString);

        return true;
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

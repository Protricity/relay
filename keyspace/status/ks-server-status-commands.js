/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSStatusCommands = function (SocketServer) {
        SocketServer.addCommand(ksStatusSocketCommand);
    };
})();


var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

function ksStatusSocketCommand(commandString, client) {
    var match = /^keyspaces?\.status/i.exec(commandString);
    if (!match)
        return false;

    ServerSubscriptions.handleKeySpaceStatusCommand(commandString, client);
    return true;
}

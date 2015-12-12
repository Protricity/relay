/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initSocketServerContactsCommands = function (SocketServer) {
        SocketServer.addCommand(ksContactsStatusCommand);
    };
})();


function ksContactsStatusCommand(commandString, client) {
    var match = /^keyspace\.contacts\.status\s+([a-f0-9 ]{8,})?$/i.exec(commandString);
    if(!match)
        return false;

    var uids = match[1].split(' ');
    console.log("TODO: contact status: " + uids.join(' '));
    client.send("INFO TODO: contact status: " + uids.join(' '));
    return true;
}

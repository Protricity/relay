/**
 * Ari 7/2/2015.
 */
if (!module) var module = {exports:{}};
module.exports.initClientPGPAuthCommands = function(Client) {
    Client.addCommand(pgpAuthCommand);
    Client.addCommand(pgpValidateCommand);

    /**
     * @param commandString
     */
    function pgpAuthCommand(commandString) {
        var match = /^pgp.auth/i.exec(commandString);
        if(!match)
            return false;

        // TODO: all or select sockets
        Client.sendWithSocket(commandString); // sendSocket
        return true;
    }

    /**
     * @param commandString
     */
    function pgpValidateCommand(commandString) {
        var match = /^pgp.validate\s+(\w{8,})/im.exec(commandString);
        if(!match)
            return false;

        console.log(commandString);
        return true;
    }
};
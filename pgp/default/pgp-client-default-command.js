/**
 * Ari 7/2/2015.
 */
if (!module) var module = {exports:{}};
module.exports.initClientPGPDefaultCommands = function(Client) {
    Client.addCommand(defaultCommand);

    /**
     * @param commandString DEFAULT [PGP Private Key Fingerprint]
     */
    function defaultCommand(commandString, e) {
        var match = /^pgp.default\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        var publicKeyID = match[1].trim().split(/\W+/g)[0];
        publicKeyID = publicKeyID.substr(publicKeyID.length - 16);
        console.log("TODO: default", publicKeyID);
    }
};
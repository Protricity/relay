/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutPublishCommand = function(Client) {
    Client.addCommand(putPublishCommand);

    // TODO: review command
    function putPublishCommand(commandString) {
        var match = /^put\.publish\s+([a-f0-9]{8,16})\s+([\s\S]+)$/im.exec(commandString);
        if (!match)
            return false;

        var pgp_id_public = match[1];
        var content = match[2];

        Client.sendWithSocket(commandString);
        return true;
    }

};

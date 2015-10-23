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
        var timestamp = match[2];


        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        KeySpaceDB.getContent(pgp_id_public, timestamp, function(err, entryData) {
            if(err)
                throw new Error(err);

            if(!entryData)
                throw new Error("Entry missing: " + pgp_id_public + ' ' + timestamp);

            commandString = "PUT " + pgp_id_public + " " + entryData.content;
            Client.sendWithSocket(commandString);
        });

        return true;
    }

};

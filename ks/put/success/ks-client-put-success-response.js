/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutSuccessResponse = function(Client) {
    Client.addResponse(putSuccessResponse);

    /**
     * @param responseString PUT.SUCCESS [PGP ID] [timestamp]
     * @returns {boolean}
     */
    function putSuccessResponse(responseString) {
        console.log(responseString);
        var match = /^put\.success\s+([a-f0-9]{8,16})\s+(\d+)$/im.exec(responseString);
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

            console.info("TODO: mark publish success", pgp_id_public, timestamp);
        });

        return true;
    }
};

/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutKeySpaceCommand = function(Client) {
    Client.addCommand(putCommand);
    console.info("Loaded: " + self.location);


    // TODO: review command
    function putCommand(commandString) {
        var match = /^put\s+(-p|--publish\s+)?(\w+)\s+([\s\S]+)$/im.exec(commandString);
        if (!match)
            return false;

        var publish = match[1] && match[1].length > 0;
        var pgp_id_public = match[2] || null;

        var content = (match[3] || '').trim();

        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        // Only encrypted messages will be accepted
        self.module = {exports: {}};
        importScripts('pgp/lib/openpgpjs/openpgp.js');
        var openpgp = self.module.exports;
        var pgpClearSignedMessage = openpgp.cleartext.readArmored(content);
        var pgpSignedContent = pgpClearSignedMessage.armor().trim();

        //console.log(pgpClearSignedMessage);

        var path = /data-path=["'](\S+)["']/i.exec(pgpClearSignedMessage.text)[1];
        var timestamp = pgpClearSignedMessage.packets[0].created.getTime();
        // parseInt(/data-timestamp=["'](\d+)["']/i.exec(pgpClearSignedMessage.text)[1]);

        //if(!pgp_id_public) {
        //    var pgpClearSignedMessage = openpgp.cleartext.readArmored(pgpSignedContent);
        //    pgpSignedContent = pgpClearSignedMessage.armor();
        //    var encIDs = getEncryptionKeyIds(pgpClearSignedMessage.packets);
        //    pgp_id_public = encIDs[0].toHex().toUpperCase();
        //}

        // Query public key for verification
        var requestURL = 'http://' + pgp_id_public + '.ks/public/id';
        KeySpaceDB.queryOne(requestURL, function(err, publicKeyBlock) {
            if(err)
                throw new Error(err);
            if(!publicKeyBlock)
                throw new Error("Public key not found: " + pgp_id_public);

            var publicKey = openpgp.key.readArmored(publicKeyBlock.content).keys[0];

            openpgp.verifyClearSignedMessage(publicKey, pgpClearSignedMessage)
                .then(function(decryptedContent) {
                    for(var i=0; i<decryptedContent.signatures.length; i++)
                        if(!decryptedContent.signatures[i].valid)
                            throw new Error("Invalid Signature: " + decryptedContent.signatures[i].keyid.toHex().toUpperCase());

                    console.info("Verified Signed Content for: " + pgp_id_public);
                    KeySpaceDB.addVerifiedContentToDB(pgpSignedContent, pgp_id_public, timestamp, path, {},
                        function(err, insertData) {

                            var url = "http://" + pgp_id_public + '.ks/' + insertData.path;

                            // Publish only if requested
                            if(publish) {
                                console.info("Publishing: " + url);
                                Client.sendWithSocket("PUT " + pgp_id_public + "\n" + content);

                            } else {
                                console.info("Added Unpublished Keyspace Content: " + url);
                            }

                            //
                            //var status_box = "<strong>Key Space</strong> content stored <span class='success'>Successfully</span>: " +
                            //    "<br/><a href='" + url + "'>" + insertData.path + "</a>";
                            //
                            //self.module = {exports: {}};
                            //importScripts('ks/put/manage/render/ks-put-manage-form.js');
                            //self.module.exports.renderPutManageForm(url, status_box, function (html) {
                            //    Client.render(html);
                            //    //Client.postResponseToClient("CLOSE ks-put:");
                            //});
                        });

                })
                .catch(function(err) {
                    callback(err, null);
                });

        });

        return true;
    }

    //function getEncryptionKeyIds(packets) {
    //    var keyIds = [];
    //    var pkESKeyPacketlist = packets.filterByTag(openpgp.enums.packet.publicKeyEncryptedSessionKey);
    //    pkESKeyPacketlist.forEach(function(packet) {
    //        keyIds.push(packet.publicKeyId);
    //    });
    //    return keyIds;
    //}

    //function putResponse(responseString) {
    //    if (responseString.substr(0, 3).toLowerCase() !== 'put')
    //        return false; // throw new Error("Invalid ks-put: " + responseString);
    //    throw new Error("Not Implemented: " + responseString);
    //    //Client.postResponseToClient(responseString);
    //    //return true;
    //}

};

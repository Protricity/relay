/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSPutKeySpaceCommand = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(putCommand);
        console.info("Loaded: " + self.location);


        // TODO: review command
        function putCommand(commandString) {
            var match = /^put\s+(-p|--publish\s+)?(\w+)\s+([\s\S]+)$/im.exec(commandString);
            if (!match)
                return false;

            var publish = match[1] && match[1].length > 0;
            var pgp_id_public = match[2] || null;

            var content = (match[3] || '').trim();

            self.module = {exports: self.exports = {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            // Only clear-signed or encrypted messages will be accepted
            self.module = {exports: self.exports = {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;


            // Query public key for verification
            var requestURL = 'http://' + pgp_id_public + '.ks/public/id';
            KeySpaceDB.queryOne(requestURL, function (err, publicKeyBlock) {
                if (err)
                    throw new Error(err);
                if (!publicKeyBlock)
                    throw new Error("Public key not found: " + pgp_id_public);

                var publicKey = openpgp.key.readArmored(publicKeyBlock.content).keys[0];

                if(content.indexOf("-----BEGIN PGP SIGNED MESSAGE-----") === 0) {

                    var pgpClearSignedMessage = openpgp.cleartext.readArmored(content);
                    var pgpSignedContent = pgpClearSignedMessage.armor().trim();

                    openpgp.verifyClearSignedMessage(publicKey, pgpClearSignedMessage)
                        .then(function (decryptedContent) {
                            for (var i = 0; i < decryptedContent.signatures.length; i++)
                                if (!decryptedContent.signatures[i].valid)
                                    throw new Error("Invalid Signature: " + decryptedContent.signatures[i].keyid.toHex().toUpperCase());

                            var path = /data-path=["'](\S+)["']/i.exec(decryptedContent.text)[1];
                            var timestamp = pgpClearSignedMessage.packets[0].created.getTime();

                            console.info("Verified Signed Content for: " + pgp_id_public);
                            KeySpaceDB.addVerifiedContentToDB(pgpSignedContent, pgp_id_public, timestamp, path, {},
                                function (err, insertData) {
                                    if(err)
                                        throw new Error(err);

                                    // Publish only if requested
                                    if (publish) {
                                        console.info("Publishing: " + pgp_id_public + " " + timestamp);
                                        ClientWorkerThread.sendWithSocket("PUT " + pgp_id_public + "\n" + content);
                                    }
                                });
                        });

                } else if(content.indexOf("-----BEGIN PGP MESSAGE-----") === 0) {

                    var pgpEncryptedMessage = openpgp.message.readArmored(content);
                    var pgpEncryptedContent = pgpEncryptedMessage.armor().trim();

                    var to_pgp_id_public = pgpEncryptedMessage.packets[0].publicKeyId.toHex().toUpperCase();
                    var from_pgp_id_public = pgpEncryptedMessage.packets[1].publicKeyId.toHex().toUpperCase();
                    to_pgp_id_public = to_pgp_id_public.substr(to_pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                    from_pgp_id_public = from_pgp_id_public.substr(from_pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

                    if(from_pgp_id_public !== pgp_id_public) {
                        if(to_pgp_id_public !== pgp_id_public)
                            throw new Error("Destination PGP ID not found in packet (" + to_pgp_id_public + ", " + from_pgp_id_public + " !== " + pgp_id_public + ")");

                        // Switch order
                        from_pgp_id_public = to_pgp_id_public;
                        to_pgp_id_public = pgp_id_public;
                    }

                    var entryFields = {
                        unprocessed: 1
                    };
                    KeySpaceDB.addEncryptedMessageToDB(pgpEncryptedContent, to_pgp_id_public, from_pgp_id_public, entryFields,
                        function (err, insertData) {
                            if(err)
                                throw new Error(err);

                            // Publish only if requested
                            console.info("Publishing Encrypted Message: " + pgp_id_public);
                            ClientWorkerThread.sendWithSocket("PUT " + pgp_id_public + "\n" + content);
                        });

                } else {
                    throw new Error("KeySpace content must be a PGP SIGNED MESSAGE or PGP MESSAGE");
                }

            });

            return true;
        }

        //
        //var status_box = "<strong>Key Space</strong> content stored <span class='success'>Successfully</span>: " +
        //    "<br/><a href='" + url + "'>" + insertData.path + "</a>";
        //
        //self.module = {exports: {}};
        //importScripts('keyspace/put/manage/render/ks-put-manage-form.js');
        //self.module.exports.renderPutManageForm(url, status_box, function (html) {
        //    Client.render(html);
        //    //Client.postResponseToClient("CLOSE ks-put:");
        //});

        //if(!pgp_id_public) {
        //    var pgpClearSignedMessage = openpgp.cleartext.readArmored(pgpSignedContent);
        //    pgpSignedContent = pgpClearSignedMessage.armor();
        //    var encIDs = getEncryptionKeyIds(pgpClearSignedMessage.packets);
        //    pgp_id_public = encIDs[0].toHex().toUpperCase();
        //}


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
})();
/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientPGPDeleteCommand = function (Client) {
        Client.addCommand(deleteCommand);



        /**
         * @param commandString DELETE [PGP Private Key ID]
         */
        function deleteCommand(commandString, e) {
            var match = /^pgp.delete\s+(.*)$/im.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('ks/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            var publicKeyIDs = match[1].trim().split(/\W+/g);
            for (var i = 0; i < publicKeyIDs.length; i++) {
                (function (publicKeyID) {
                    publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

                    // Query private key(s)
                    var privateKeyPath = 'http://' + publicKeyID + '.ks/.private/id';
                    KeySpaceDB.queryOne(privateKeyPath, function (err, privateKeyData) {
                        if (err)
                            throw new Error(err);
                        if (privateKeyData) {
                            KeySpaceDB.deleteContent(privateKeyData.pgp_id_public, privateKeyData.timestamp, function (err) {
                                if (err)
                                    throw new Error(err);
                                console.info("PGP Identity deleted successfully: " + privateKeyData.user_id);

                                var status_box = "<span class='success'>PGP Identity deleted successfully</span>: " + privateKeyData.user_id + "<br/>Public Key ID: " + publicKeyID;

                                self.module = {exports: {}};
                                importScripts('pgp/manage/render/pgp-manage-form.js');
                                self.module.exports.renderPGPManageForm(status_box, function (html) {
                                    Client.render(html);
                                });
                            });
                        } else {
                            console.error("Not found: " + publicKeyID);
                        }
                    });
                })(publicKeyIDs[i]);
            }
            return true;
        }

    };
})();
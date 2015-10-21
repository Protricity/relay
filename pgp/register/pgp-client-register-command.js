/**
 * Ari 7/2/2015.
 */
if (!module) var module = {exports:{}};
module.exports.initClientPGPRegisterCommands = function(Client) {
    Client.addCommand(registerCommand);
    Client.addCommand(unregisterCommand);

    /**
     * @param commandString REGISTER
     */
    function registerCommand(commandString, e) {
        var match = /^pgp.register\s*([\s\S]+)?$/im.exec(commandString);
        if(!match)
            return false;

        // TODO: require passphrase on register?

        if(match[1]) {
            self.exports = {};
            self.module = {exports: {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            self.module = {exports: {}};
            importScripts('ks/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            var privateKeyBlock = (match[1] || '').replace(/(\r\n|\r|\n)/g, '\r\n');
            var privateKey = openpgp.key.readArmored(privateKeyBlock).keys[0];
            var privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
            privateKeyID = privateKeyID.substr(privateKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var publicKey = privateKey.toPublic();
            var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            var publicKeyBlock = publicKey.armor();
            publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var userIDString = privateKey.getUserIds().join('; ');

            var customFields = {
                pgp_id_private: privateKeyID,
                user_id: userIDString,
                passphrase_required: privateKey.primaryKey.isDecrypted ? false : true
            };

            var path = '/.private/id';
            KeySpaceDB.addVerifiedContentToDB(privateKeyBlock, publicKeyID, path, Date.now(), customFields, function(err, insertData) {
                if(err)
                    throw new Error(err);

                var customFields = {
                    pgp_id_private: privateKeyID,
                    user_id: userIDString
                };

                var path = '/public/id';
                KeySpaceDB.addVerifiedContentToDB(publicKeyBlock, publicKeyID, path, Date.now(), customFields, function(err, insertData) {
                    if(err)
                        throw new Error(err);

                    var status_content = "\
                        <span class='success'>PGP Key Pair registered successfully</span><br/><br/>\n\
                        <span class='info'>You may now make use of your new identity:</span><br/>\n\
                        User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>";

                    require('pgp/manage/render/pgp-manage-form.js')
                        .renderPGPManageForm(status_content, function(html) {
                            Client.replace('pgp:', html);
                        });

                });
            });
            return true;

        } else {
            var status_content = "Paste a new PGP PRIVATE KEY BLOCK to register a new PGP Identity manually";

            self.module = {exports: {}};
            importScripts('pgp/register/render/pgp-register-form.js');
            var templateExports = self.module.exports;
            templateExports.renderPGPRegisterForm('', status_content, function(html) {
                Client.render(html);
            });
            // Free up template resources
            delete Templates.pgp.register;
            return true;

        }
    }


    /**
     * @param commandString UNREGISTER [PGP Private Key Fingerprint]
     */
    function unregisterCommand(commandString, e) {
        var match = /^pgp.unregister\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        var publicKeyIDs = match[1].trim().split(/\W+/g);
        for(var i=0; i<publicKeyIDs.length; i++) {
            (function (publicKeyID) {
                publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

                // Query private key(s)
                var privateKeyPath = 'http://' + publicKeyID + '.ks/.private/id';
                KeySpaceDB.queryOne(privateKeyPath, function(err, privateKeyData) {
                    if(err)
                        throw new Error(err);
                    if(privateKeyData) {
                        KeySpaceDB.deleteContent(privateKeyData.pgp_id_public, privateKeyData.timestamp, function(err) {
                            if(err)
                                throw new Error(err);
                            console.info("PGP Identity deleted successfully: " + privateKeyData.user_id);
                            manageCommand("MANAGE", e, "<span class='success'>PGP Identity deleted successfully</span>: " + privateKeyData.user_id + "<br/>Public Key ID: " + publicKeyID);
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
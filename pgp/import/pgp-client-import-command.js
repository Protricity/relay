/**
 * Ari 7/2/2015.
 */
if (!module) var module = {exports:{}};
module.exports.initClientPGPImportCommands = function(Client) {
    Client.addCommand(importCommand);
    Client.addCommand(deleteCommand);

    /**
     * @param commandString PGP.IMPORT
     */
    function importCommand(commandString, e) {
        var match = /^pgp\.import(\.form)?\s*([\s\S]+)?$/im.exec(commandString);
        if(!match)
            return false;

        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        // TODO: require passphrase on register?
        var privateKeyBlock = (match[2] || '').replace(/(\r\n|\r|\n)/g, '\r\n');
        var showForm = (match[1] || '').toLowerCase() === '.form';

        var status_box = "Paste a new PGP PRIVATE KEY BLOCK to import a new PGP Identity manually";

        var privateKeyID, publicKeyID, userIDString, publicKeyBlock;
        if(privateKeyBlock) {
            self.exports = {};
            self.module = {exports: {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;


            var privateKey = openpgp.key.readArmored(privateKeyBlock).keys[0];
            privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
            privateKeyID = privateKeyID.substr(privateKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var publicKey = privateKey.toPublic();
            publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            publicKeyBlock = publicKey.armor();
            publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            userIDString = privateKey.getUserIds().join('; ');

            status_box = "\
                    <span class='success'>PGP Key Pair generated successfully</span><br/><br/>\n\
                    <span class='info'>You may now import (register) the following identity:</span><br/>\n\
                    User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>\n\
                    Private Key ID: <strong>" + privateKeyID + "</strong><br/>\n\
                    Public Key ID: <strong>" + publicKeyID + "</strong><br/>\n\
                    Passphrase: <strong>" + (privateKey.primaryKey.isDecrypted ? 'No' : 'Yes') + "</strong><br/>";
        }


        if(!showForm && privateKeyBlock) {

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

                    status_box = "\
                        <span class='success'>PGP Key Pair imported successfully</span><br/><br/>\n\
                        <span class='info'>You may now make use of your new identity:</span><br/>\n\
                        User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>";

                    self.module = {exports: {}};
                    importScripts('pgp/manage/render/pgp-manage-form.js');
                    self.module.exports.renderPGPManageForm(status_box, function(html) {
                        Client.replace('pgp:', html);
                    });

                });
            });
            return true;

        } else {
            self.module = {exports: {}};
            importScripts('pgp/import/render/pgp-import-form.js');
            var templateExports = self.module.exports;
            templateExports.renderPGPImportForm(privateKeyBlock, status_box, function(html) {
                Client.render(html);
            });
            return true;

        }
    }


    /**
     * @param commandString DELETE [PGP Private Key ID]
     */
    function deleteCommand(commandString, e) {
        var match = /^pgp.delete\s+(.*)$/im.exec(commandString);
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
/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientPGPImportCommands = function (Client) {
        Client.addCommand(importCommand);

        /**
         * @param commandString PGP.IMPORT
         */
        function importCommand(commandString, e) {
            var match = /^pgp\.import(\.form)?\s*([\s\S]+)?$/im.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            // TODO: require passphrase on register?
            var privateKeyBlock = (match[2] || '').replace(/(\r\n|\r|\n)/g, '\r\n');
            var showForm = (match[1] || '').toLowerCase() === '.form';

            var status_box = "Paste a new PGP PRIVATE KEY BLOCK to import a new PGP Identity manually";


            if (!showForm && privateKeyBlock) {
                var privateKeyID, publicKeyID, userIDString, publicKeyBlock, publicKeyTimeStamp, privateKeyTimeStamp;

                self.exports = {};
                self.module = {exports: {}};
                importScripts('pgp/lib/openpgpjs/openpgp.js');
                var openpgp = self.module.exports;


                var privateKey = openpgp.key.readArmored(privateKeyBlock).keys[0];
                privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
                privateKeyID = privateKeyID.substr(privateKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                var publicKeyCreateDate = privateKey.subKeys[0].subKey.created;
                privateKeyTimeStamp = publicKeyCreateDate.getTime();

                var publicKey = privateKey.toPublic();
                publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                publicKeyBlock = publicKey.armor();
                publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                publicKeyTimeStamp = publicKeyCreateDate.getTime() + 1;  // UID must be different from private key

                userIDString = privateKey.getUserIds().join('; ');

                status_box = "\
                    <span class='success'>PGP Key Pair generated successfully</span><br/><br/>\n\
                    <span class='info'>You may now import (register) the following identity:</span><br/>\n\
                    User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>\n\
                    Private Key ID: <strong>" + privateKeyID + "</strong><br/>\n\
                    Public Key ID: <strong>" + publicKeyID + "</strong><br/>\n\
                    Passphrase: <strong>" + (privateKey.primaryKey.isDecrypted ? 'No' : 'Yes') + "</strong><br/>";

                var customFields = {
                    pgp_id_private: privateKeyID,
                    user_id: userIDString,
                    passphrase_required: privateKey.primaryKey.isDecrypted ? false : true
                };

                var path = '/.private/id';
                KeySpaceDB.addVerifiedContentToDB(privateKeyBlock, publicKeyID, privateKeyTimeStamp, path, customFields, function (err, insertData) {
                    if (err)
                        throw err;

                    var customFields = {
                        pgp_id_private: privateKeyID,
                        user_id: userIDString
                    };

                    var path = '/public/id';
                    KeySpaceDB.addVerifiedContentToDB(publicKeyBlock, publicKeyID, publicKeyTimeStamp, path, customFields, function (err, insertData) {
                        if (err)
                            throw err;

                        status_box = "\
                        <span class='success'>PGP Key Pair imported successfully</span><br/><br/>\n\
                        <span class='info'>You may now make use of your new identity:</span><br/>\n\
                        User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>";

                        self.module = {exports: {}};
                        importScripts('pgp/manage/render/pgp-manage-form.js');
                        self.module.exports.renderPGPManageForm(status_box, function (html) {
                            Client.render(html);
                        });

                    });
                });
                return true;

            } else {
                self.module = {exports: {}};
                importScripts('pgp/import/render/pgp-import-form.js');
                var templateExports = self.module.exports;
                templateExports.renderPGPImportForm(privateKeyBlock, status_box, function (html) {
                    Client.render(html);
                });
                return true;

            }
        }

    };
})();
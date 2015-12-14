/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientPGPImportCommands = function (ClientWorker) {
        ClientWorker.addCommand(importCommand);

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
            var pgpKeyBlock = (match[2] || '').replace(/(\r\n|\r|\n)/g, '\r\n');
            var showForm = (match[1] || '').toLowerCase() === '.form';

            var status_box = "Paste a new PGP PRIVATE KEY BLOCK to import a new PGP Identity manually";


            if (!showForm && pgpKeyBlock) {
                var publicKeyID, publicKeyBlock;

                self.exports = {};
                self.module = {exports: {}};
                importScripts('pgp/lib/openpgpjs/openpgp.js');
                var openpgp = self.module.exports;
                var pgpImport = openpgp.key.readArmored(pgpKeyBlock);
                if(pgpImport.err && pgpImport.err.length > 0)
                    throw new Error(pgpImport.err[0]);
                var pgpKey = pgpImport.keys[0];
                if(!pgpKey)
                    throw new Error("PGP Key block not found in import");
                    
                if(pgpKey.isPrivate()) {
                    var privateKey = pgpKey;
                    var privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
                    privateKeyID = privateKeyID.substr(privateKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                    var privateKeyTimeStamp = privateKey.subKeys[0].subKey.created.getTime();


                    var exportedPublicKey = privateKey.toPublic();
                    publicKeyID = exportedPublicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                    publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                    var exportedPublicKeyTimeStamp = exportedPublicKey.subKeys[0].subKey.created.getTime() + 1;  // UID must be different from private key


                    var privateKeyUserIDString = privateKey.getUserIds().join('; ');

                    var path = '/.private/id';
                    KeySpaceDB.addVerifiedContentToDB(privateKey.armor(), publicKeyID, privateKeyTimeStamp, path, {
                        user_id: privateKeyUserIDString,
                        pgp_id_private: privateKeyID,
                        pgp_id_public: publicKeyID,
                        passphrase_required: privateKey.primaryKey.isDecrypted ? false : true
                    }, function (err, insertData) {
                        if (err)
                            throw new Error(err.message);

                        var path = '/public/id';
                        KeySpaceDB.addVerifiedContentToDB(exportedPublicKey.armor(), publicKeyID, exportedPublicKeyTimeStamp, path, {
                            user_id: privateKeyUserIDString,
                            pgp_id_private: privateKeyID,
                            pgp_id_public: publicKeyID
                        }, function (err, insertData) {
                            if (err)
                                throw new Error(err.message);

                            status_box = "\
                                <span class='success'>PGP Private Key imported successfully</span><br/><br/>\n\
                                <span class='info'>You may now make use of your new identity:</span><br/>\n\
                                User ID: <strong>" + privateKeyUserIDString.replace(/</g, '&lt;') + "</strong><br/>";

                            self.module = {exports: {}};
                            importScripts('pgp/manage/render/pgp-manage-form.js');
                            self.module.exports.renderPGPManageForm(status_box, function (html) {
                                ClientWorker.render(html);
                            });

                            ClientWorker.postResponseToClient("CLOSE pgp-import:");
                        });
                    });
                } else {

                    var publicKey = pgpKey;
                    publicKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
                    publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                    var publicKeyTimeStamp = publicKey.primaryKey.created.getTime() + 1;  // UID must be different from private key

                    var publicKeyUserIDString = publicKey.getUserIds().join('; ');

                    var publicKeyPath = '/public/id';
                    KeySpaceDB.addVerifiedContentToDB(publicKey.armor(), publicKeyID, publicKeyTimeStamp, publicKeyPath, {
                        user_id: publicKeyUserIDString,
                        pgp_id_public: publicKeyID
                    }, function (err, insertData) {
                        if (err)
                            throw new Error(err.message);

                        status_box = "\
                            <span class='success'>PGP Public Key imported successfully</span><br/><br/>\n\
                            <span class='info'>This PGP Identity and KeySpace now available to your relay client:</span><br/>\n\
                            User ID: <strong>" + publicKeyUserIDString.replace(/</g, '&lt;') + "</strong><br/>";

                        self.module = {exports: {}};
                        importScripts('pgp/manage/render/pgp-manage-form.js');
                        self.module.exports.renderPGPManageForm(status_box, function (html) {
                            ClientWorker.render(html);
                        });

                        ClientWorker.postResponseToClient("CLOSE pgp-import:");
                    });
                }

                return true;

            } else {
                status_box = status_box || "\
                        <span class='success'>PGP Key Pair generated successfully</span><br/><br/>\n\
                        <span class='info'>You may now import (register) the following identity:</span><br/>\n\
                        User ID: <strong>" + publicKeyUserIDString.replace(/</g, '&lt;') + "</strong><br/>\n\
                        Private Key ID: <strong>" + privateKeyID + "</strong><br/>\n\
                        Public Key ID: <strong>" + publicKeyID + "</strong><br/>\n\
                        Passphrase: <strong>" + (privateKey.primaryKey.isDecrypted ? 'No' : 'Yes') + "</strong><br/>";

                self.module = {exports: {}};
                importScripts('pgp/import/render/pgp-import-form.js');
                var templateExports = self.module.exports;
                templateExports.renderPGPImportForm(pgpKeyBlock, status_box, function (html) {
                    ClientWorker.render(html);
                });
                return true;

            }
        }

    };
})();
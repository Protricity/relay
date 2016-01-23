/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientPGPImportCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(importCommand);

        /**
         * @param commandString PGP.IMPORT
         */
        function importCommand(commandString, e) {
            var match = /^pgp\.import(\.form)?\s*([\s\S]+)?$/im.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: self.exports = {}};
            importScripts('pgp/import/render/pgp-import-form.js');
            var templateExports = self.module.exports;

            self.module = {exports: self.exports = {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            self.module = {exports: self.exports = {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            // TODO: require passphrase on register?
            var pgpKeyBlock = (match[2] || '').replace(/(\r\n|\r|\n)/g, '\r\n');
            var showForm = (match[1] || '').toLowerCase() === '.form';

            var status_box = "Paste a new PGP PRIVATE KEY BLOCK to import a new PGP Identity manually";

            function doErr(message) {
                status_box = "<span class='error'>" + message + "</span>";
                templateExports.renderPGPImportForm(pgpKeyBlock, status_box, function (html) {
                    ClientWorkerThread.render(html);
                });
                return false;
                //return new Error(message);
            }

            if (pgpKeyBlock) {
                var publicKeyID, publicKeyBlock;

                var pgpImport = openpgp.key.readArmored(pgpKeyBlock);
                if(pgpImport.err && pgpImport.err.length > 0)
                    return doErr(pgpImport.err[0]);
                var pgpKey = pgpImport.keys[0];
                if(!pgpKey)
                    return doErr("PGP Key block not found in import");

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
                    if(showForm) {
                        status_box = "\
                                <span class='success'>PGP Private Key Block read successfully</span><br/><br/>\n\
                                <span class='info'>You may now <span class='command'>import</span> (register) the following identity:</span><br/>\n\
                                User ID: <strong>" + privateKeyUserIDString.replace(/</g, '&lt;') + "</strong><br/>\n\
                                Private Key ID: <strong>" + privateKeyID + "</strong><br/>\n\
                                Public Key ID: <strong>" + publicKeyID + "</strong><br/>\n\
                                Passphrase: <strong>" + (privateKey.primaryKey.isDecrypted ? 'No' : 'Yes') + "</strong><br/>";

                        templateExports.renderPGPImportForm(pgpKeyBlock, status_box, function (html) {
                            ClientWorkerThread.render(html);
                        });
                        return true;

                    } else {
                        var path = '/.private/id';
                        KeySpaceDB.addVerifiedContentToDB(privateKey.armor(), publicKeyID, privateKeyTimeStamp, path, {
                            user_id: privateKeyUserIDString,
                            pgp_id_private: privateKeyID,
                            pgp_id_public: publicKeyID,
                            passphrase_required: privateKey.primaryKey.isDecrypted ? false : true
                        }, function (err, insertData) {
                            console.log(arguments);
                            if (err)
                                return doErr(err.message || err);

                            var path = '/public/id';
                            KeySpaceDB.addVerifiedContentToDB(exportedPublicKey.armor(), publicKeyID, exportedPublicKeyTimeStamp, path, {
                                user_id: privateKeyUserIDString,
                                pgp_id_private: privateKeyID,
                                pgp_id_public: publicKeyID
                            }, function (err, insertData) {
                                console.log(arguments);
                                if (err)
                                    return doErr(err.message);

                                status_box = "\
                                    <span class='success'>PGP Private Key imported successfully</span><br/><br/>\n\
                                    <span class='info'>You may now make use of your new identity:</span><br/>\n\
                                    User ID: <strong>" + privateKeyUserIDString.replace(/</g, '&lt;') + "</strong><br/>";
console.log(status_box);
                                self.module = {exports: {}};
                                importScripts('pgp/manage/render/pgp-manage-form.js');
                                self.module.exports.renderPGPManageForm(status_box, function (html) {
                                    ClientWorkerThread.render(html);
                                });

                                ClientWorkerThread.postResponseToClient("CLOSE pgp-import:");
                            });
                        });
                    }
                } else {

                    var publicKey = pgpKey;
                    publicKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
                    publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                    var publicKeyTimeStamp = publicKey.primaryKey.created.getTime() + 1;  // UID must be different from private key

                    var publicKeyUserIDString = publicKey.getUserIds().join('; ');

                    if(showForm) {
                        status_box = "\
                                <span class='success'>PGP Public Key Block read successfully</span><br/><br/>\n\
                                <span class='info'>You may now <span class='command'>import</span> (register) the following identity:</span><br/>\n\
                                User ID: <strong>" + publicKeyUserIDString.replace(/</g, '&lt;') + "</strong><br/>\n\
                                Public Key ID: <strong>" + publicKeyID + "</strong><br/>";

                        templateExports.renderPGPImportForm(pgpKeyBlock, status_box, function (html) {
                            ClientWorkerThread.render(html);
                        });
                        return true;

                    } else {
                        var publicKeyPath = '/public/id';
                        KeySpaceDB.addVerifiedContentToDB(publicKey.armor(), publicKeyID, publicKeyTimeStamp, publicKeyPath, {
                            user_id: publicKeyUserIDString,
                            pgp_id_public: publicKeyID
                        }, function (err, insertData) {
                            if (err)
                                return doErr(err.message);

                            status_box = "\
                                <span class='success'>PGP Public Key imported successfully</span><br/><br/>\n\
                                <span class='info'>This PGP Identity and KeySpace now available to your relay client:</span><br/>\n\
                                User ID: <strong>" + publicKeyUserIDString.replace(/</g, '&lt;') + "</strong><br/>";

                            self.module = {exports: {}};
                            importScripts('pgp/manage/render/pgp-manage-form.js');
                            self.module.exports.renderPGPManageForm(status_box, function (html) {
                                ClientWorkerThread.render(html);
                            });

                            ClientWorkerThread.postResponseToClient("CLOSE pgp-import:");
                        });
                    }
                }

                return true;

            } else {
                templateExports.renderPGPImportForm(pgpKeyBlock, status_box, function (html) {
                    ClientWorkerThread.render(html);
                });
                return true;

            }
        }

    };
})();
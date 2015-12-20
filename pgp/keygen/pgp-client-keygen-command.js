/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientPGPKeyGenCommand = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(keygenCommand);

        /**
         * @param commandString PGP.KEYGEN --bits [2048] --pass [passphrase] --name [user id]
         */
        function keygenCommand(commandString, e) {
            var match = /^pgp.keygen\s*(.+)?$/im.exec(commandString);
            if (!match)
                return false;

            var content = match[1] || '';
            if (content) {
                var autoImport = false;
                content = content.replace(/--import /i, function (match, contents, offset, s) {
                    autoImport = true;
                    return '';
                });

                var bits = 2048;
                content = content.replace(/--bits (\d+)/i, function (match, contents, offset, s) {
                    bits = parseInt(contents);
                    return '';
                });

                var passphrase = null;
                content = content.replace(/--pass(?:phrase)? ([^-]+)/i, function (match, contents, offset, s) {
                    passphrase = contents.trim();
                    return '';
                });

                var userID = content.trim();
                content.replace(/--(?:name|user) ([^-]+)/i, function (match, contents, offset, s) {
                    userID = contents;
                    return '';
                });

                self.module = {exports: self.exports = {}};
                importScripts('pgp/lib/openpgpjs/openpgp.js');
                var openpgp = self.module.exports;

                openpgp.generateKeyPair({
                    keyType: 1,
                    numBits: bits,
                    userId: userID,
                    passphrase: passphrase

                }).then(function (keyPair) {
                    var privateKey = keyPair.key;
                    var newPrivateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
                    var newPublicKeyID = privateKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                    console.log("New PGP Key Generated: ", newPrivateKeyID, newPublicKeyID);

                    //registerCommand("REGISTER " + keyPair.privateKeyArmored);

                    var userIDString = privateKey.getUserIds().join('; ');

                    //var publicKeyBlock = publicKey.armor();



                    if(autoImport) {

                        var commandString = "PGP.IMPORT " + keyPair.privateKeyArmored;
                        ClientWorkerThread.execute(commandString);
                        return true;


                    } else {

                        self.module = {exports: {}};
                        importScripts('pgp/import/render/pgp-import-form.js');
                        var templateExports = self.module.exports;

                        var generated_status_box = "\
                            <span class='success'>PGP Key Pair generated successfully</span><br/><br/>\n\
                            <span class='info'>You may now import the following identity:</span><br/>\n\
                            User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>\n\
                            Private Key ID: <strong>" + newPrivateKeyID + "</strong><br/>\n\
                            Public Key ID: <strong>" + newPublicKeyID + "</strong><br/>\n\
                            Passphrase: <strong>" + (privateKey.primaryKey.isDecrypted ? 'No' : 'Yes') + "</strong><br/>";

                        templateExports.renderPGPImportForm(keyPair.privateKeyArmored, generated_status_box, function (html) {
                            ClientWorkerThread.render(html);
                        });
                        return true;
                    }


                });

                return true;

            } else {
                self.module = {exports: {}};
                importScripts('pgp/keygen/render/pgp-keygen-form.js');
                var templateExports = self.module.exports;

                templateExports.renderPGPKeyGenForm('', function (html) {
                    ClientWorkerThread.render(html);
                });

                return true;
            }
        }

    };
})();
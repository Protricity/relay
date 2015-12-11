/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSHostCommands = function (ClientWorker) {
        ClientWorker.addCommand(ksHostCommand);
        ClientWorker.addResponse(ksHostResponse);

        ClientWorker.addResponse(ksChallengeResponse);

        function ksHostCommand(commandString) {
            var match = /^(?:keyspace\.)?host\s+([a-f0-9]{8,16})$/i.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            self.module = {exports: {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            var pgp_id_public = match[1].substr(match[1].length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var requestURL = "http://" + pgp_id_public + ".ks/.private/id";
            KeySpaceDB.queryOne(requestURL, function (err, contentData) {
                if (err)
                    throw new Error(err);

                if (!contentData)
                    throw new Error("Could not find Private Key: " + requestURL);

                var privateKey = openpgp.key.readArmored(contentData.content).keys[0];

                //var privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
                var publicKeyID = privateKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();

                commandString = "KEYSPACE.HOST " + publicKeyID;
                ClientWorker.sendWithSocket(commandString);
            });
            return true;
        }

        function ksHostResponse(responseString, e) {
            var match = /^(?:keyspace\.)?host\s+([a-f0-9]{8,16})$/i.exec(responseString);
            if (!match)
                return false;

            if(typeof KeySpaceDB === 'undefined') {
                self.module = {exports: {}};
                importScripts('keyspace/ks-db.js');
                var KeySpaceDB = self.module.exports.KeySpaceDB;
            }

            var pgp_id_public = match[1].substr(match[1].length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var webSocket = e.target;
            KeySpaceDB.addSocketHost(pgp_id_public, webSocket);

            return true;
        }

        //var challengeValidations = [];

        function ksChallengeResponse(responseString) {
            var match = /^(?:keyspace\.)?host\.challenge\s+([\s\S]+)$/im.exec(responseString);
            if (!match)
                return false;

            var encryptedChallengeString = match[1];

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            self.module = {exports: {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            var pgpEncryptedMessage = openpgp.message.readArmored(encryptedChallengeString);
            var pgp_id_public = pgpEncryptedMessage.getEncryptionKeyIds()[0].toHex().toUpperCase();

            var requestURL = "http://" + pgp_id_public + ".ks/.private/id";
            KeySpaceDB.queryOne(requestURL, function (err, contentData) {
                if (err)
                    throw new Error(err);

                if (!contentData)
                    throw new Error("Could not find Private Key: " + requestURL);

                var privateKey = openpgp.key.readArmored(contentData.content).keys[0];

                // TODO: handle passphrase
                openpgp.decryptMessage(privateKey, pgpEncryptedMessage)
                    .then(function (decryptedChallenge) {
                        //challengeValidations.push([pgp_id_public, decryptedChallenge]);
                        ClientWorker.sendWithSocket("KEYSPACE.HOST.VALIDATE " + decryptedChallenge);

                    }).catch(console.error);
            });

            return true;
        }


    };
})();
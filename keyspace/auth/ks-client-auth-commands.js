/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSAuthCommands = function (ClientWorker) {
        ClientWorker.addCommand(ksChallengeCommand);
        ClientWorker.addResponse(ksChallengeResponse);

        //var challengeValidations = [];

        function ksChallengeCommand(commandString) {
            var match = /^auth.challenge\s+([\s\S]+)$/im.exec(commandString);
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
                        ClientWorker.sendWithSocket("auth.validate " + decryptedChallenge);

                    }).catch(console.error);
            });

            return true;
        }

        function ksChallengeResponse(responseString) {
            var match = /^auth.challenge\s+([\s\S]+)$/im.exec(responseString);
            if (!match)
                return false;

            return ksChallengeCommand(responseString);
        }

    };
})();
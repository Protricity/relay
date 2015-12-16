/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSHostCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(ksAutoHostCommand);
        ClientWorkerThread.addCommand(ksHostCommand);
        ClientWorkerThread.addResponse(ksHostResponse);

        ClientWorkerThread.addResponse(ksChallengeResponse);

        function ksAutoHostCommand(commandString) {
            var match = /^(?:keyspace\.)?host\.auto$/i.exec(commandString);
            if (!match)
                return false;

            var path = '.private/id';
            KeySpaceDB.queryAll(path, function(err, contentData) {
                if (err)
                    throw new Error(err);
                if (contentData
                    && typeof contentData.tags !== 'undefined'
                    && contentData.tags.indexOf("KEYSPACE.HOST.AUTO") >= 0) {
                    ksHostCommand("KEYSPACE.HOST " + contentData.pgp_id_public);
                }
            });
            return true;
        }

        function ksHostCommand(commandString) {
            var match = /^((?:keyspace\.)?host(?:\.offline|\.online)?)\s+([a-f0-9]{8,16})$/i.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            self.module = {exports: {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            var commandPrefix = match[1];
            var pgp_id_public = match[2];
            pgp_id_public = pgp_id_public.substr(pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var requestURL = "http://" + pgp_id_public + ".ks/.private/id";
            KeySpaceDB.queryOne(requestURL, function (err, contentData) {
                if (err)
                    throw new Error(err);

                if (!contentData)
                    throw new Error("Could not find Private Key: " + requestURL);

                var privateKey = openpgp.key.readArmored(contentData.content).keys[0];

                //var privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
                var publicKeyID = privateKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();

                commandString = commandPrefix + " " + publicKeyID;
                ClientWorkerThread.sendWithSocket(commandString);

                // TODO: flag for auto online or wait for explicit offline instruction?

                // Update Auto Online Flag
                if(typeof contentData.tags === 'undefined')
                    contentData.tags = [];
                if(contentData.tags.indexOf("KEYSPACE.HOST.AUTO") === -1) {
                    contentData.tags.push('KEYSPACE.HOST.AUTO');
                    // Remove duplicate tags
                    contentData.tags = contentData.tags.filter(function(el,i,a){
                        return(i==a.indexOf(el));
                    });
                    KeySpaceDB.update(KeySpaceDB.DB_TABLE_HTTP_CONTENT, contentData, function(err, contentData) {
                        console.log("Auto-online enabled for", contentData);
                    });
                }

            });
            return true;
        }

        function ksHostResponse(responseString, e) {
            var match = /^keyspace\.host(\.online|\.offline)?\s+([a-f0-9]{8,16})$/i.exec(responseString);
            if (!match)
                return false;

            if(typeof KeySpaceDB === 'undefined') {
                self.module = {exports: {}};
                importScripts('keyspace/ks-db.js');
                var KeySpaceDB = self.module.exports.KeySpaceDB;
            }

            var onlineStatus = (match[1] || '').toLowerCase() !== '.offline';
            var pgp_id_public = match[2];
            pgp_id_public = pgp_id_public.substr(pgp_id_public.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var webSocket = e.target;
            if(onlineStatus) {
                KeySpaceDB.addSocketHost(pgp_id_public, webSocket);

            } else {
                KeySpaceDB.removeSocketHost(pgp_id_public, webSocket);
            }

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
                        ClientWorkerThread.sendWithSocket("KEYSPACE.HOST.VALIDATE " + decryptedChallenge);

                    }).catch(console.error);
            });

            return true;
        }


    };
})();
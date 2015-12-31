/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSSubscribeCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addResponse(ksChallengeResponse);

        ClientWorkerThread.addCommand(ksSubscribeCommand);
        ClientWorkerThread.addResponse(ksSubscribeResponse);


        // KEYSPACE.SUBSCRIBE.GET ABCD1234
        // KEYSPACE.SUBSCRIBE.PUT ABCD1234
        // KEYSPACE.SUBSCRIBE ABCD1234
        // KEYSPACE.GET ABCD1234/path
        // KEYSPACE.SUBSCRIBE.CHAT /state/az guest123
        // KEYSPACE.SUBSCRIBE.CHAT /state/az guest123
        function ksSubscribeResponse(responseString, e) {
            var match = /^keyspaces?\.(un|re)?(subscribe)/i.exec(responseString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('client/subscriptions/client-subscriptions.js');
            var ClientSubscriptions = self.module.exports.ClientSubscriptions;

            var oldSubscriptionString = ClientSubscriptions.handleSubscriptionResponse(responseString, e);

            ClientWorkerThread.processResponse("EVENT " + responseString);

            return true;
        }


        function ksSubscribeCommand(commandString) {
            var match = /^keyspace\.(un)?subscribe/im.exec(commandString);
            if (!match)
                return false;

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }



        function ksChallengeResponse(responseString) {
            var match = /^(?:keyspace\.)?auth\.challenge\s+([\s\S]+)$/im.exec(responseString);
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
                        ClientWorkerThread.sendWithSocket("KEYSPACE.AUTH.VALIDATE " + decryptedChallenge);

                    }).catch(function(err) {

                        console.error(err);
                    });
            });

            return true;
        }


//
//        function ksHostCommand(commandString) {
//            var match = /^keyspace\.(un|re)?(host|subscribe)\.(get|put|post|status)\s+([a-f0-9]{8,16})$/im.exec(commandString);
//            if (!match)
//                return false;
//
//            var prefix = (match[1]||'').toLowerCase();
//            var command = (match[2] || '').toLowerCase();
//            var mode = (match[3] || '').toLowerCase();
//            var pgp_id_public = match[4];
////             console.log(match);
//
//            // Update Settings
//            self.module = {exports: {}};
//            importScripts('client/settings/settings-db.js');
//            var SettingsDB = self.module.exports.SettingsDB;
//
//            SettingsDB.getSettings("onconnect:subscriptions", function(subscriptionSettings) {
//                if(typeof subscriptionSettings.commands === 'undefined')
//                    subscriptionSettings.commands = [];
//                var commands = subscriptionSettings.commands;
//                var oldSubscriptionPos = -1;
//                for(var i=0; i<commands.length; i++) {
//                    if(commands[i].indexOf(commandString) === 0)
//                        oldSubscriptionPos = i;
//                }
//                if(prefix === 'un') {
//                    if(oldSubscriptionPos >= 0) {
//                        console.log("Removing Auto-Subscription: ", commandString);
//                        commands.splice(oldSubscriptionPos, 1);
//                    } else {
//                        console.error("Old subscription not found in settings");
//                    }
//
//                } else  {
//                    if(oldSubscriptionPos >= 0) {
//                        if(commands[oldSubscriptionPos] !== commandString) {
//                            console.log("Replacing Auto-Subscription (" + oldSubscriptionPos + "): ", commandString);
//                            commands[oldSubscriptionPos] = commandString;
//                        } else {
//                            //console.log("Ignoring unchanged Auto-Subscription (" + oldSubscriptionPos + "): ", settingsCommandStringPrefix);
//                        }
//                    } else {
//                        console.log("Adding Auto-Subscription: ", commandString);
//                        commands.push(commandString);
//                    }
//                }
//                SettingsDB.updateSettings(subscriptionSettings);
//            });
//
//            ClientWorkerThread.sendWithSocket(commandString);
//            return true;
//        }

    };
})();
/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientUICommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(contactCommand);
        ClientWorkerThread.addResponse(eventListener, true);

        var refreshTimeout = null;
        function eventListener(responseString) {
            var match = /^event (keyspace|channel)\.(\w+)\s*(.*)$/i.exec(responseString);
            if (!match)
                return false;

            var type = match[1].toLowerCase();
            var mode = match[2].toLowerCase();
            var args = match[3].split(' ');


            switch(type) {
                case 'keyspace':
                    var pgp_id_public = args[0];
                    var timestamp = args[1];
                    var path = args[2];
                    switch(mode) {
                        case 'insert':
                            switch(path) {
                                case 'public/id':
                                    // TODO: check if subscribed?
                                    console.info("Subscribing to inserted Public Key: ", pgp_id_public);
                                    ClientWorkerThread.sendWithSocket("KEYSPACE.SUBSCRIBE.EVENT " + pgp_id_public);
                                    break;
                            }
                            break;
                        case 'delete':
                            switch(path) {
                                case 'public/id':
                                    // TODO: check if subscribed?
                                    console.info("Unsubscribing from deleted Public Key: ", pgp_id_public);
                                    ClientWorkerThread.sendWithSocket("KEYSPACE.UNSUBSCRIBE.EVENT " + pgp_id_public);
                                    break;
                            }
                            break;
                    }
                    break;
            }

            if(refreshTimeout)
                clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(function() {
                 console.info("Refreshing Contact List: " + responseString);
                contactCommand("UI.CONTACTS.REFRESH");
            }, 500);

            return false;
        }


        var activeContactList = false;
        function contactCommand(commandString) {
            var match = /^(?:ui\.)?contacts(\.refresh)?/i.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('render/ui/contacts/render/ui-contacts.js');
            var templateExports = self.module.exports;

            templateExports.renderUIContactList(function (html) {
                Client.render(html);
            });

            if(!activeContactList) {
                activeContactList = true;
                //console.info("Requesting contact list status");

                self.module = {exports: {}};
                importScripts('keyspace/ks-db.js');
                var KeySpaceDB = self.module.exports.KeySpaceDB;

                //var ClientSubscriptions = self.ClientSubscriptions || (function() {
                //    self.module = {exports: {}};
                //    importScripts('client/subscriptions/client-subscriptions.js');
                //    return self.ClientSubscriptions = self.module.exports.ClientSubscriptions;
                //})();


                // Query public keys.
                var path = 'public/id';
                var publicKeys = [];
                KeySpaceDB.queryAll(path, function(err, publicKeyContentEntry) {
                    if (err)
                        throw new Error(err);

                    if (publicKeyContentEntry) {
                        publicKeys.push(publicKeyContentEntry.pgp_id_public);
                        //ClientSubscriptions.cachePublicKeyInfo(publicKeyContentEntry);

                    } else {
                        if(publicKeys.length)
                            ClientWorkerThread.sendWithSocket("KEYSPACES.SUBSCRIBE.EVENT " + publicKeys.join(" "));

                        // Query private keys.
                        var path = '.private/id';
                        KeySpaceDB.queryAll(path, function(err, privateKeyContentEntry) {
                            if (err)
                                throw new Error(err);

                            if (privateKeyContentEntry) {
                                var pgp_id_public = privateKeyContentEntry.pgp_id_public;
                                //ClientSubscriptions.cachePrivateKeyInfo(privateKeyContentEntry);
                                // TODO: check settings for online/offline/away etc
                                ClientWorkerThread.execute("KEYSPACE.STATUS " + pgp_id_public + " ONLINE");

                            }
                        });

                    }
                });

            }

            return true;
        }

    };
})();
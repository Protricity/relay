/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientUICommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(contactCommand);
        ClientWorkerThread.addResponse(eventListener, true);

        var refreshTimeout = null;
        function eventListener(responseString) {
            var match = /^event (keyspace\.|channel\.)/i.exec(responseString);
            if (match) {
                if(refreshTimeout)
                    clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(function() {
//                     console.info("Refreshing Contact List: " + responseString);
                    contactCommand("UI.CONTACTS.REFRESH");
                }, 500);
            }

            return false;
        }

        var activeContactList = null;
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

            if(activeContactList === null) {
                console.log("Requesting contact list status");

                self.module = {exports: {}};
                importScripts('keyspace/ks-db.js');
                var KeySpaceDB = self.module.exports.KeySpaceDB;

                activeContactList = [];
                // Query public keys
                var path = 'public/id';
                KeySpaceDB.queryAll(path, function(err, contentEntry) {
                    if (err)
                        throw new Error(err);

                    if (contentEntry) {
                        // TODO: subscribe to all in database? No other way to get status.
                        activeContactList.push(contentEntry.pgp_id_public);

                    } else {
                        if(activeContactList.length)
                            ClientWorkerThread.sendWithSocket("KEYSPACE.SUBSCRIBE.EVENT " + activeContactList.join(" "));

                    }
                });
            }

            return true;
        }

    };
})();
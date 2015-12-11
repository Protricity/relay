/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientPGPListCommand = function (ClientWorker) {
        ClientWorker.addCommand(pgpListCommand);

        /**
         * @param commandString
         */
        function pgpListCommand(commandString, e) {
            var match = /^(pgp\.list)(\.private)?/i.exec(commandString);
            if (!match)
                return false;

            var listString = match[0] + match[1];
            var listPrivate = match[2] ? true : false;

            self.exports = {};
            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            // Query private keys
            var path = listPrivate ? 'public/id' : '.private/id';
            var count = 0;

            //var listString = "PGP.LIST";
            KeySpaceDB.queryAll(path, function(err, contentEntry) {
                if(err)
                    throw new Error(err);

                if(contentEntry) {

                    listString += "\n" +
                        contentEntry.pgp_id_private + " " +
                        contentEntry.pgp_id_public + " " +
                        (contentEntry.passphrase_required ? "1 " : "0 ") +
                        contentEntry.user_id;

                    count++;

                } else {

                    ClientWorker.postResponseToClient(listString);
                }
            });

            return true;
        }

    };
})();
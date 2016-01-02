/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSPassphraseCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(ksPassphraseCommand);

        function ksPassphraseCommand(commandString, e) {
            var match = /^(?:keyspace\.)?pass(?:phrase)?\s+([a-f0-9 ]{8,})/i.exec(commandString);
            if (!match)
                return false;

            //var pgp_id_public = match[1];

            self.module = {exports: {}};
            importScripts('keyspace/passphrase/render/ks-passphrase-window.js');
            self.module.exports.renderKeySpacePassphraseWindow(commandString, e, function(html) {
                ClientWorkerThread.render(html);
            });

            return true;
        }


    };

})();
/**
 * KeySpace Passphrase Prompt Handler
 * 
 * Provides clien-side command handling for KEYSPACE.PASSPHRASE
 */
 
 
if(typeof module === 'object') (function() {
    
    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientKSPassphraseCommands = function (ClientWorkerThread) {
        
        // Add Command/Response Handlers   
        ClientWorkerThread.addCommand(ksPassphraseCommand);

        // Active Containers
        var activeContainers = [];

        /**
         * Handles Command: KEYSPACE.PASSPHRASE [Private Key ID] [passphrase]
         * @param {string} commandString The command string to process 
         * @param {object} e event The command event
         * @return {boolean} true if handled otherwise false
         **/
        function ksPassphraseCommand(commandString, e) {
            var match = /^(?:keyspace\.)?pass(?:phrase)?(?:\.(\w+))?\s+([a-f0-9]{8,})\s*(.*)/i.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler


            var subCommand = (match[1] || '').toLowerCase();
            var pgp_id_public = match[2].toUpperCase();
            var passphrase = match[3];

            var CONTAINER_ID = 'ks-passphrase-window:' + pgp_id_public;

            var renderWindow = true;
            switch(subCommand) {
                case 'success':
                    console.log("Passphrase success: ", pgp_id_public);
                    ClientWorkerThread.postResponseToClient('CLOSE ' + CONTAINER_ID);
                    return true;

                case 'fail':
                    renderWindow = false;
                    //console.error("Passphrase fail: ", pgp_id_public);
                    ClientWorkerThread.postResponseToClient('EVENT KEYSPACE.PASSPHRASE.FAIL ' + pgp_id_public);
                    break;

                case 'try':
                    renderWindow = false;
                    ClientWorkerThread.postResponseToClient('EVENT KEYSPACE.PASSPHRASE.TRY ' + pgp_id_public);
                    break;
            }

            self.module = {exports: {}};
            importScripts('keyspace/passphrase/ks-client-passphrases.js');
            var ClientPassPhrases = self.module.exports.ClientPassPhrases;

            if(passphrase) {
                ClientPassPhrases.requestDecryptedPrivateKey(pgp_id_public, passphrase);
                    //function(err, decryptedPrivateKey) {
                    //    if(err)
                    //        throw new Error(err);
                    //    if(!decryptedPrivateKey)
                    //        throw new Error("No Decrypted Private Key");
                    //    if(!decryptedPrivateKey.primaryKey.isDecrypted)
                    //        throw new Error("Private Key is not decrypted");

                        //console.info("TODO: Private Key Decrypted", decryptedPrivateKey);
                    //}
                //);

            } else if(renderWindow) {

                if(activeContainers.indexOf(CONTAINER_ID) === -1) {
                    activeContainers.push(CONTAINER_ID);
                    // If no passphrase, render the passphrase window
                    self.module = {exports: {}};
                    importScripts('keyspace/passphrase/render/ks-passphrase-window.js');
                    self.module.exports.renderKeySpacePassphraseWindow(commandString, e, function(html) {
                        ClientWorkerThread.render(html);
                    });
                } else {
                    ClientWorkerThread.postResponseToClient('OPEN ' + CONTAINER_ID);
                }
            }

            // Command was handled
            return true;
        }

    };

})();

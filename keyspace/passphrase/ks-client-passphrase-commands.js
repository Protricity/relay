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

        /**
         * Handles Command: KEYSPACE.PASSPHRASE [passphrase]
         * @param {string} commandString The command string to process 
         * @param {object} e event The command event
         * @return {boolean} true if handled otherwise false
         **/
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

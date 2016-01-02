/**
 * KeySpace Auth Client Commands
 * 
 * Provides client-side command and response handling for KEYSPACE.AUTH
 */
 
if(typeof module === 'object') (function() {

    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientKSAuthCommands = function (ClientWorkerThread) {

        // Add Command/Response Handlers        
        ClientWorkerThread.addCommand(ksAuthCommand);
        ClientWorkerThread.addResponse(ksAuthResponse);


        /**
         * Handles Command: KEYSPACE.AUTH
         * @param {string} commandString The command string to process 
         * @param {object} e event The command Event
         * @return {boolean} true if handled otherwise false
         **/
        function ksAuthCommand(commandString) {
            var match = /^keyspace\.auth/i.exec(commandString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            // Forward command to socket server
            ClientWorkerThread.sendWithSocket(commandString);
     
            // Command was handled 
            return true;
        }
        
        
        /**
         * Handles Response: KEYSPACE.AUTH
         * @param {string} responseString The response string to process 
         * @param {object} e event The response Event
         * @return {boolean} true if handled otherwise false
         **/
        function ksAuthResponse(responseString, e) {
            var match = /^keyspace\.auth/i.exec(responseString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            // Import ClientSubscription instance
            self.module = {exports: {}};
            importScripts('client/subscriptions/client-subscriptions.js');
            var ClientSubscriptions = self.module.exports.ClientSubscriptions;

            // Handle Response
            ClientSubscriptions.handleKeySpaceAuthResponse(responseString, e);

            // Response was handled
            return true;
        }

    };
})();

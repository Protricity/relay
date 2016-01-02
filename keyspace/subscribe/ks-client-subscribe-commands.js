/**
 * KeySpace Subscription Commands
 * 
 * Provides command and response handling for KEYSPACE.SUBSCRIBE
 */
 
if(typeof module === 'object') (function() {
    
    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientKSSubscribeCommands = function (ClientWorkerThread) {

        // Add Command/Response Handlers    
        ClientWorkerThread.addCommand(ksSubscribeCommand);
        ClientWorkerThread.addResponse(ksSubscribeResponse);

        /**
         * Handles Response: KEYSPACE.SUBSCRIBE[.mode] arg1 arg2
         * @param {string} responseString The response string to process 
         * @param {object} e event The response Event
         * @return {boolean} true if handled otherwise false
         **/
        function ksSubscribeResponse(responseString, e) {
            var match = /^keyspaces?\.(un|re)?(subscribe)/i.exec(responseString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            self.module = {exports: {}};
            importScripts('client/subscriptions/client-subscriptions.js');
            var ClientSubscriptions = self.module.exports.ClientSubscriptions;

            var oldSubscriptionString = ClientSubscriptions.handleSubscriptionResponse(responseString, e);

            ClientWorkerThread.processResponse("EVENT " + responseString);

            // Response was handleded
            return true;
        }


        /**
         * Handles Command: KEYSPACE.UNSUBSCRIBE
         * @param {string} commandString The command string to process 
         * @param {object} e The command Event
         * @return {boolean} true if handled otherwise false
         **/
        function ksSubscribeCommand(commandString) {
            var match = /^keyspace\.(un)?subscribe/im.exec(commandString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            // Forward to socket server
            ClientWorkerThread.sendWithSocket(commandString);

            // Command was handleded
            return true;
        }

    };
})();

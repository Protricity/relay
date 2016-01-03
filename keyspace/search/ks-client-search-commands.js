/**
 * KeySpace Search Commands
 * 
 * Provides command and response handling for KEYSPACE.SEARCH
 */
 
if(typeof module === 'object') (function() {
    
    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientKSSearchCommands = function (ClientWorkerThread) {
        
        // Add Command/Response Handlers   
        ClientWorkerThread.addCommand(ksSearchCommand);
        ClientWorkerThread.addResponse(ksSearchResponse);

        // Last Search value
        var lastSearch = null;
        
        /**
         * Handles Command: KEYSPACE.SEARCH [search]
         * @param {string} commandString The command string to process 
         * @param {object} e The command Event
         * @return {boolean} true if handled otherwise false
         **/
        function ksSearchCommand(commandString) {
            var match = /^(keyspace\.)?search\s*(.*)/i.exec(commandString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            if(!match[1])   // Add "KEYSPACE." if missing
                commandString = "KEYSPACE." + commandString;

            // Remember search value
            lastSearch = match[2];

            // Forward command to socket server
            ClientWorkerThread.sendWithSocket(commandString);
            
            // Command was handled
            return true;
        }


        /**
         * Handles Response: KEYSPACE.SEARCH [search]
         * @param {string} responseString The response string to process 
         * @param {object} e event The response Event
         * @return {boolean} true if handled otherwise false
         **/
        function ksSearchResponse(responseString, e) {
            var match = /^keyspace\.search/i.exec(responseString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            self.module = {exports: {}};
            importScripts('keyspace/search/render/ks-search-window.js');
            self.module.exports.renderKeySpaceSearchWindow(responseString, e, lastSearch, function(html) {
                ClientWorkerThread.render(html);
            });

            console.info("Search Results: " + responseString);

            // Response was handled
            return true;
        }
    };
})();

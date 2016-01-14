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

        var activeSuggestions = [];

        var suggestionStats = [0,0,0]; // [Channels, Clients, Keyspaces]
        var searchWindowActive = false;

        /**
         * Handles Command: KEYSPACE.SEARCH [search]
         * @param {string} commandString The command string to process 
         * @param {object} e The command Event
         * @return {boolean} true if handled otherwise false
         * TODO: needs cleanup
         **/
        function ksSearchCommand(commandString, e) {
            var match = /^(keyspace\.)?search(?:\.(\w+))?\s*(.*)$/im.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            if(!match[1])   // Add "KEYSPACE." if missing
                commandString = "KEYSPACE." + commandString;

            // Remember search value
            lastSearch = match[3];

            var renderSearchWindow = true;
            var subCommand = match[2];
            if(subCommand) {
                switch(subCommand.toLowerCase()) {
                    case 'suggest':
                        var suggestedKeySpaces = match[3];
                        activeSuggestions.unshift(suggestedKeySpaces);
                        suggestionStats[2] = activeSuggestions.length;
                        console.info("Added Custom Suggested KeySpace: ", suggestedKeySpaces);
                        ClientWorkerThread.processResponse("EVENT KEYSPACE.SEARCH.LIST\n"
                            + activeSuggestions.join("\n"));
                        return true;

                    case 'text':
                    case 'list':
                        ClientWorkerThread.processResponse("EVENT KEYSPACE.SEARCH.LIST\n"
                            + activeSuggestions.join("\n"));
                        renderSearchWindow = false;
                        break;

                    default:
                        throw new Error("Invalid subCommand: " + subCommand);
                }
            }

            // Forward command to socket server
            ClientWorkerThread.sendWithSocket(commandString);

            if(renderSearchWindow) {
                if (searchWindowActive === false) {
                    searchWindowActive = true;
                    self.module = {exports: {}};
                    importScripts('keyspace/search/render/ks-search-window.js');
                    self.module.exports.renderKeySpaceSearchWindow(activeSuggestions, suggestionStats, lastSearch, function (html) {
                        ClientWorkerThread.render(html);
                        //ClientWorkerThread.postResponseToClient("OPEN ks-search-window:");
                    });

                } else {
                    ClientWorkerThread.postResponseToClient("OPEN ks-search-window:");
                }
            }

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
            var match = /^keyspace\.search\.results([\s\S]+)$/im.exec(responseString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var newResults = match[1].split("\n");
            suggestionStats = newResults.shift().trim().split(" ");

            var addedKeySpaces = [];
            for(var i=0; i<newResults.length; i++) {
                if(activeSuggestions.indexOf(newResults[i]) === -1) {
                    activeSuggestions.unshift(newResults[i]);
                    addedKeySpaces.push(newResults[i]);
                }
            }
            if(addedKeySpaces.length > 0)
                console.info("Added Suggested KeySpaces: ", addedKeySpaces);

            suggestionStats[2] = activeSuggestions.length;

            self.module = {exports: {}};
            importScripts('keyspace/search/render/ks-search-window.js');

            if(searchWindowActive === true) {
                self.module.exports.renderKeySpaceSearchWindowResults(activeSuggestions, suggestionStats, lastSearch, function(html) {
                    ClientWorkerThread.render(html);
                });

            } else {
                // searchWindowActive = true;
                // self.module.exports.renderKeySpaceSearchWindow(activeSuggestions, suggestionStats, lastSearch, function(html) {
                //    ClientWorkerThread.render(html);
                // });
            }

            // Send an event with all active results
            ClientWorkerThread.processResponse("EVENT KEYSPACE.SEARCH.RESULTS\n" + activeSuggestions.join("\n"));

            // Response was handled
            return true;
        }
    };
})();

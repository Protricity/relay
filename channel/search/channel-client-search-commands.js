/**
 * Channel Search Commands
 * 
 * Provides command and response handling for CHANNEL.SEARCH
 */
 
if(typeof module === 'object') (function() {
    
    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientChannelSearchCommands = function (ClientWorkerThread) {
        
        // Add Command/Response Handlers     
        ClientWorkerThread.addCommand(channelSearchCommand);
        ClientWorkerThread.addResponse(channelSearchResponse);

        // Last Search value
        var lastSearch = null;

        var activeSuggestions = [];

        /**
         * Handles Command: CHANNEL.SEARCH [To: PGP ID] [From: PGP ID] [search]
         * @param {string} commandString The command string to process 
         * @param {object} e The command Event
         * @return {boolean} true if handled otherwise false
         **/
        function channelSearchCommand(commandString, e) {
            var match = /^(channel\.)?search(?:\.(\w+))?\s*(.*)$/im.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            if(!match[1])   // Add "CHANNEL." if missing
                commandString = "CHANNEL." + commandString;

            // Remember search value
            var subCommand = match[2];
            if(subCommand) {
                switch(subCommand.toLowerCase()) {
                    case 'suggest':
                        var suggestedChannel = match[3];
                        activeSuggestions.unshift(suggestedChannel);
                        console.info("Added Custom Suggested Channel: ", suggestedChannel);
                        ClientWorkerThread.processResponse("EVENT CHANNEL.SEARCH.LIST\n"
                            + activeSuggestions.join("\n"));
                        return true;

                    case 'list':
                        ClientWorkerThread.processResponse("EVENT CHANNEL.SEARCH.LIST\n"
                            + activeSuggestions.join("\n"));
                        return true;
                        
                    default:
                        throw new Error("Invalid subCommand: " + subCommand);
                }
            }

            // Remember search value
            lastSearch = match[3];

            // Forward command to socket server
            ClientWorkerThread.sendWithSocket(commandString);

            self.module = {exports: {}};
            importScripts('channel/search/render/channel-search-window.js');
            self.module.exports.renderChannelSearchWindow(activeSuggestions, lastSearch, function(html) {
                ClientWorkerThread.render(html);
            });

            // local suggestions
            suggestLocalChannels(
                function(channelList) {
                    var addedChannels = [];
                    for(var i=0; i<channelList.length; i++) {
                        if(activeSuggestions.indexOf(channelList[i]) === -1) {
                            activeSuggestions.unshift(channelList[i]);
                            addedChannels.push(channelList[i]);
                        }
                    }
                    if(addedChannels.length > 0) {
                        console.info("Added Suggested Channels: ", addedChannels);
                        ClientWorkerThread.processResponse("EVENT CHANNEL.SEARCH.LIST\n"
                            + activeSuggestions.join("\n"));
                    }

                    self.module = {exports: {}};
                    importScripts('channel/search/render/channel-search-window.js');
                    self.module.exports.renderChannelSearchWindow(activeSuggestions, lastSearch, function(html) {
                        ClientWorkerThread.render(html);
                    });
                }
            );

            // Command was handled
            return true;
        }


        /**
         * Handles Response: CHANNEL.SEARCH [To: PGP ID] [From: PGP ID] [search]
         * @param {string} responseString The response string to process 
         * @param {object} e event The response Event
         * @return {boolean} true if handled otherwise false
         **/
        function channelSearchResponse(responseString, e) {

            var match = /^channel\.search\.results([\s\S]+)$/im.exec(responseString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var newResults = match[1].split("\n");
            var stats = newResults.shift();

            var addedChannels = [];
            for(var i=0; i<newResults.length; i++) {
                if(activeSuggestions.indexOf(newResults[i]) === -1) {
                    activeSuggestions.unshift(newResults[i]);
                    addedChannels.push(newResults[i]);
                }
            }
            if(addedChannels.length > 0)
                console.info("Added Suggested Channels: ", addedChannels);

            self.module = {exports: {}};
            importScripts('channel/search/render/channel-search-window.js');
            self.module.exports.renderChannelSearchWindow(activeSuggestions, lastSearch, function(html) {
                ClientWorkerThread.render(html);
            });

            // Response was handled
            return true;
        }


        function suggestLocalChannels(callback) {

            //newScript.setAttribute('src', self.location.protocol + '//www.telize.com/geoip?callback=_geoipcallback');

            self._geoipcallback = function(result) {

                if (result.country_name)
                    result.country = result.country_name;
                if (result.region_name)
                    result.region = result.region_name;
                if (result.zip_code)
                    result.postal_code = result.zip_code;
                if (result.timezone)
                    result.time_zone = result.timezone;

                var channelList = [
                    "/timezone/" + result.time_zone,
                    "/country/" + result.country_code,
                    "/region/" + result.region_code,
                    "/city/" + result.city,
                    "/zipcode/" + result.postal_code,
                    "/ip/" + result.ip
                ];

                callback(channelList);
            };

            importScripts("https://freegeoip.net/json/?callback=_geoipcallback");

        }

    };
})();

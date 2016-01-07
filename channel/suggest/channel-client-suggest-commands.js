/**
 * Channel Suggest Commands
 * 
 * Provides command and response handling for CHANNEL.SUGGEST
 */
 
if(typeof module === 'object') (function() {
    
    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientChannelSuggestCommands = function (ClientWorkerThread) {
        
        // Add Command/Response Handlers     
        ClientWorkerThread.addCommand(channelSuggestCommand);
        ClientWorkerThread.addResponse(channelSuggestResponse);


        /**
         * Handles Command: CHANNEL.SUGGEST [To: PGP ID] [From: PGP ID] [suggest]
         * @param {string} commandString The command string to process 
         * @param {object} e The command Event
         * @return {boolean} true if handled otherwise false
         **/
        function channelSuggestCommand(commandString, e) {
            var match = /^(?:channel\.)?suggest/im.exec(commandString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            return true;
        }


        /**
         * Handles Response: CHANNEL.SUGGEST [To: PGP ID] [From: PGP ID] [suggest]
         * @param {string} responseString The response string to process 
         * @param {object} e event The response Event
         * @return {boolean} true if handled otherwise false
         **/
        function channelSuggestResponse(responseString, e) {
            var match = /^(?:channel\.)?suggest/im.exec(responseString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler


            return true;
        }

        //var activeSuggests = [];
        //function renderSuggestWindow(pgp_id_to, pgp_id_from, switchOnResponse, callback) {
        //    var uid = pgp_id_to + ':' + pgp_id_from;
        //    if(switchOnResponse)
        //        uid = pgp_id_from + ':' + pgp_id_to;
        //
        //    if (activeSuggests.indexOf(uid) === -1) {
        //        getSuggestExports().renderSuggestWindow(pgp_id_to, pgp_id_from, switchOnResponse,
        //            function (html) {
        //                ClientWorkerThread.render(html);
        //                activeSuggests.push(uid);
        //                if(callback)
        //                    callback();
        //            }
        //        );
        //
        //        // Check for missing public keys
        //        requestPublicKeyContent(pgp_id_to);
        //        requestPublicKeyContent(pgp_id_from);
        //
        //    } else {
        //        ClientWorkerThread.postResponseToClient("FOCUS channel-suggest:" + uid);
        //        if(callback)
        //            callback();
        //    }
        //}

    };
})();

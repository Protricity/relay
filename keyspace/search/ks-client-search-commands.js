/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSSearchCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(ksSearchCommand);
        ClientWorkerThread.addResponse(ksSearchResponse);

        function ksSearchCommand(commandString) {
            var match = /^(keyspace\.)?search/i.exec(commandString);
            if (!match)
                return false;

            if(!match[1])
                commandString = "KEYSPACE." + commandString;

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }

        function ksSearchResponse(responseString, e) {
            var match = /^keyspace\.search/i.exec(responseString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('keyspace/search/render/ks-search-window.js');
            self.module.exports.renderKeySpaceSearchWindow(responseString, e, function(html) {
                ClientWorkerThread.render(html);
            });

            console.info("Search Results: " + responseString);

            return true;
        }

    };

})();
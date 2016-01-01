/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSScanCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(ksScanCommand);
        ClientWorkerThread.addResponse(ksScanResponse);


        // KEYSPACE.SCAN ABCD1234 ONLINE
        function ksScanResponse(responseString, e) {
            var match = /^keyspace\.scan/i.exec(responseString);
            if (!match)
                return false;

            throw new Error("TODO: " + responseString);
            //self.module = {exports: {}};
            //importScripts('client/subscriptions/client-subscriptions.js');
            //var ClientSubscriptions = self.module.exports.ClientSubscriptions;
            //
            //ClientSubscriptions.handleKeySpaceScanResponse(responseString, e);

            return true;
        }

        function ksScanCommand(commandString) {
            var match = /^(?:keyspace\.)?scan/i.exec(commandString);
            if (!match)
                return false;

            if(!match[1])
                commandString = "KEYSPACE." + commandString;

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }
    };

})();
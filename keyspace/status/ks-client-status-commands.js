/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSStatusCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(ksStatusCommand);
        ClientWorkerThread.addResponse(ksStatusResponse);


        // KEYSPACE.STATUS ABCD1234 ONLINE
        function ksStatusResponse(responseString, e) {
            var match = /^keyspace\.status\s+([a-f0-9]{8,})\s+(.*)$/i.exec(responseString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('client/subscriptions/client-subscriptions.js');
            var ClientSubscriptions = self.module.exports.ClientSubscriptions;

            ClientSubscriptions.handleKeySpaceStatusResponse(responseString, e);

            return true;
        }

        function ksStatusCommand(commandString) {
            var match = /^keyspace\.status/i.exec(commandString);
            if (!match)
                return false;

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }
    };
})();
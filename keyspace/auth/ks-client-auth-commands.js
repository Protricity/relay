/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSAuthCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(ksAuthCommand);
        ClientWorkerThread.addResponse(ksAuthResponse);


        function ksAuthResponse(responseString, e) {
            var match = /^keyspace\.auth/i.exec(responseString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('client/subscriptions/client-subscriptions.js');
            var ClientSubscriptions = self.module.exports.ClientSubscriptions;

            ClientSubscriptions.handleKeySpaceAuthResponse(responseString, e);

            return true;
        }

        function ksAuthCommand(commandString) {
            var match = /^keyspace\.auth/i.exec(commandString);
            if (!match)
                return false;

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }
    };
})();
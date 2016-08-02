/**
 * Created by ari.
 */

if(typeof module === 'object') (function() {
    module.exports.initBetaClientCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(betaSubscribe);

        function betaSubscribe(commandString) {
            var match = /^beta\.subscribe/i.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            ClientWorkerThread.sendWithSocket(commandString);

            return true;
        }
    };
})();
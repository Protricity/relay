/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSCommands = function (ClientWorker) {

        // HTTP GET Command
        ClientWorker.addCommand(importGETCommand);
        ClientWorker.addResponse(importGETCommand);
        function importGETCommand(commandString, e) {
            if (!/^(?:keyspace\.)?(get|http)/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importGETCommand);
            ClientWorker.removeResponse(importGETCommand);
            self.module = {exports: {}};
            importScripts('keyspace/get/ks-client-get-commands.js');
            module.exports.initClientKSGetCommands(ClientWorker);
            return false;
        }


        // HTTP PUT Command
        ClientWorker.addCommand(importPUTCommand);
        ClientWorker.addResponse(importPUTCommand);
        function importPUTCommand(commandString, e) {
            if (!/^(?:keyspace\.)?put/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPUTCommand);
            ClientWorker.removeResponse(importPUTCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/ks-client-put-commands.js');
            module.exports.initClientKSPutCommands(ClientWorker);
            return false;
        }


        // Keyspace Hosting Host
        ClientWorker.addCommand(importHostCommand);
        ClientWorker.addResponse(importHostCommand);
        function importHostCommand(commandString, e) {
            if (!/^(?:keyspace\.)?host/i.test(commandString))
                return false;

            ClientWorker.removeCommand(importHostCommand);
            ClientWorker.removeResponse(importHostCommand);
            self.module = {exports: {}};
            importScripts('keyspace/host/ks-client-host-commands.js');
            module.exports.initClientKSHostCommands(ClientWorker);
            //console.info("Loaded: keyspace/auth/ks-client-auth-command.js");
            return false;
        }


        // Feed Commands
        ClientWorker.addCommand(importFeedCommands);
        function importFeedCommands(commandString, e) {
            if (!/^(?:keyspace\.)?feed/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importFeedCommands);
            importScripts('keyspace/feed/ks-client-feed-commands.js');
            module.exports.initClientKSFeedCommands(ClientWorker);
            return false;
        }
    };
})();
/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSCommands = function (ClientWorker) {

        // HTTP GET Command
        ClientWorker.addCommand(importGETCommand);
        ClientWorker.addResponse(importGETCommand);
        function importGETCommand(commandString, e) {
            if (!/^(get|http)/i.test(commandString))
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
            if (!/^put/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPUTCommand);
            ClientWorker.removeResponse(importPUTCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/ks-client-put-commands.js');
            module.exports.initClientKSPutCommands(ClientWorker);
            return false;
        }


        // HTTP Response
        ClientWorker.addResponse(importAUTHCommand);
        function importAUTHCommand(commandString, e) {
            if (!/^auth/i.test(commandString))
                return false;
            ClientWorker.removeResponse(importAUTHCommand);
            self.module = {exports: {}};
            importScripts('keyspace/auth/ks-client-auth-command.js');
            module.exports.initClientKSAuthCommands(ClientWorker);
            //console.info("Loaded: keyspace/auth/ks-client-auth-command.js");
            return false;
        }


        // Feed Commands
        ClientWorker.addCommand(importFeedCommands);
        function importFeedCommands(commandString, e) {
            if (!/^feed/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importFeedCommands);
            importScripts('keyspace/feed/ks-client-feed-commands.js');
            module.exports.initClientKSFeedCommands(ClientWorker);
            return false;
        }
    };
})();
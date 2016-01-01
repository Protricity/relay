/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSCommands = function (ClientWorkerThread) {

        // HTTP GET Command
        ClientWorkerThread.addCommand(importGETCommand);
        ClientWorkerThread.addResponse(importGETCommand);
        function importGETCommand(commandString, e) {
            if (!/^(?:keyspace\.)?(get|http)/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importGETCommand);
            ClientWorkerThread.removeResponse(importGETCommand);
            self.module = {exports: {}};
            importScripts('keyspace/get/ks-client-get-commands.js');
            module.exports.initClientKSGetCommands(ClientWorkerThread);
            return false;
        }


        // HTTP PUT Command
        ClientWorkerThread.addCommand(importPUTCommand);
        ClientWorkerThread.addResponse(importPUTCommand);
        function importPUTCommand(commandString, e) {
            if (!/^(?:keyspace\.)?put/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importPUTCommand);
            ClientWorkerThread.removeResponse(importPUTCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/ks-client-put-commands.js');
            module.exports.initClientKSPutCommands(ClientWorkerThread);
            return false;
        }


        // Keyspace Subscribe Command
        ClientWorkerThread.addCommand(importSubscribeCommand);
        ClientWorkerThread.addResponse(importSubscribeCommand);
        function importSubscribeCommand(commandString, e) {
            if (!/^(?:keyspaces?\.)?((?:un|re)?subscribe)/i.test(commandString))
                return false;

            ClientWorkerThread.removeCommand(importSubscribeCommand);
            ClientWorkerThread.removeResponse(importSubscribeCommand);
            self.module = {exports: {}};
            importScripts('keyspace/subscribe/ks-client-subscribe-commands.js');
            module.exports.initClientKSSubscribeCommands(ClientWorkerThread);
            //console.info("Loaded: keyspace/auth/ks-client-auth-command.js");
            return false;
        }


        // Keyspace Auth Command
        ClientWorkerThread.addCommand(importAuthCommand);
        ClientWorkerThread.addResponse(importAuthCommand);
        function importAuthCommand(commandString, e) {
            if (!/^(?:keyspaces?\.)?auth/i.test(commandString))
                return false;

            ClientWorkerThread.removeCommand(importAuthCommand);
            ClientWorkerThread.removeResponse(importAuthCommand);
            self.module = {exports: {}};
            importScripts('keyspace/auth/ks-client-auth-commands.js');
            module.exports.initClientKSAuthCommands(ClientWorkerThread);
            return false;
        }

        // Keyspace Status Command
        ClientWorkerThread.addCommand(importKSStatusCommand);
        ClientWorkerThread.addResponse(importKSStatusCommand);
        function importKSStatusCommand(commandString, e) {
            if (!/^keyspace\.status/i.test(commandString))
                return false;

            ClientWorkerThread.removeCommand(importKSStatusCommand);
            ClientWorkerThread.removeResponse(importKSStatusCommand);
            self.module = {exports: {}};
            importScripts('keyspace/status/ks-client-status-commands.js');
            module.exports.initClientKSStatusCommands(ClientWorkerThread);
            //console.info("Loaded: keyspace/auth/ks-client-auth-command.js");
            return false;
        }


        // Keyspace Scan Command
        ClientWorkerThread.addCommand(importKSScanCommand);
        ClientWorkerThread.addResponse(importKSScanCommand);
        function importKSScanCommand(commandString, e) {
            if (!/^(?:keyspace\.)?scan/i.test(commandString))
                return false;

            ClientWorkerThread.removeCommand(importKSScanCommand);
            ClientWorkerThread.removeResponse(importKSScanCommand);
            self.module = {exports: {}};
            importScripts('keyspace/scan/ks-client-scan-commands.js');
            module.exports.initClientKSScanCommands(ClientWorkerThread);
            //console.info("Loaded: keyspace/auth/ks-client-auth-command.js");
            return false;
        }


        // Feed Commands
        ClientWorkerThread.addCommand(importFeedCommands);
        function importFeedCommands(commandString, e) {
            if (!/^(?:keyspace\.)?feed/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importFeedCommands);
            importScripts('keyspace/feed/ks-client-feed-commands.js');
            module.exports.initClientKSFeedCommands(ClientWorkerThread);
            return false;
        }
    };
})();
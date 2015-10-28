/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSCommands = function (Client) {

        // HTTP GET Command
        Client.addCommand(importGETCommand);
        Client.addResponse(importGETCommand);
        function importGETCommand(commandString, e) {
            if (!/^(get|http)/i.test(commandString))
                return false;
            Client.removeCommand(importGETCommand);
            Client.removeResponse(importGETCommand);
            self.module = {exports: {}};
            importScripts('ks/get/ks-client-get-commands.js');
            module.exports.initClientKSGetCommands(Client);
            return false;
        }


        // HTTP PUT Command
        Client.addCommand(importPUTCommand);
        Client.addResponse(importPUTCommand);
        function importPUTCommand(commandString, e) {
            if (!/^put/i.test(commandString))
                return false;
            Client.removeCommand(importPUTCommand);
            Client.removeResponse(importPUTCommand);
            self.module = {exports: {}};
            importScripts('ks/put/ks-client-put-commands.js');
            module.exports.initClientKSPutCommands(Client);
            return false;
        }


        // HTTP Response
        Client.addResponse(importAUTHCommand);
        function importAUTHCommand(commandString, e) {
            if (!/^auth/i.test(commandString))
                return false;
            Client.removeResponse(importAUTHCommand);
            self.module = {exports: {}};
            importScripts('ks/auth/ks-client-auth-command.js');
            module.exports.initClientKSAuthCommands(Client);
            //console.info("Loaded: ks/auth/ks-client-auth-command.js");
            return false;
        }


        // Feed Commands
        Client.addCommand(importFeedCommands);
        function importFeedCommands(commandString, e) {
            if (!/^feed/i.test(commandString))
                return false;
            Client.removeCommand(importFeedCommands);
            importScripts('ks/feed/ks-client-feed-commands.js');
            module.exports.initClientKSFeedCommands(Client);
            return false;
        }
    };
})();
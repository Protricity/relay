/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSPutCommands = function (ClientWorker) {

        // HTTP PUT Command
        ClientWorker.addCommand(importPutKeySpaceCommand);
        function importPutKeySpaceCommand(commandString, e) {
            if (!/^put\s+/im.test(commandString))
                return false;
            ClientWorker.removeCommand(importPutKeySpaceCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/keyspace/ks-client-put-keyspace-command.js');
            module.exports.initClientKSPutKeySpaceCommand(ClientWorker);
            return false;
        }

        // HTTP PUT.PUBLISH Command
        ClientWorker.addCommand(importPutPublishCommand);
        function importPutPublishCommand(commandString, e) {
            if (!/^put\.publish\s+/im.test(commandString))
                return false;
            ClientWorker.removeCommand(importPutPublishCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/publish/ks-client-put-publish-command.js');
            module.exports.initClientKSPutPublishCommand(ClientWorker);
            //console.info("Loaded: keyspace/put/publish/ks-client-put-keyspace-command.js");
            return false;
        }

        // HTTP PUT.FORM Command
        ClientWorker.addCommand(importPutFormCommand);
        function importPutFormCommand(commandString, e) {
            if (!/^put\s*$|^put\.form/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPutFormCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/form/ks-client-put-form-command.js');
            module.exports.initClientKSPutFormCommand(ClientWorker);
            return false;
        }


        // HTTP PUT.MANAGE Command
        ClientWorker.addCommand(importPutManageCommand);
        function importPutManageCommand(commandString, e) {
            if (!/^put\.manage/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPutManageCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/manage/ks-client-put-manage-command.js');
            module.exports.initClientKSPutManageCommand(ClientWorker);
            return false;
        }


        // HTTP PUT.SCRIPT Command
        ClientWorker.addCommand(importPutScriptCommand);
        function importPutScriptCommand(commandString, e) {
            if (!/^put\.script/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPutScriptCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/script/ks-client-put-script-command.js');
            module.exports.initClientKSPutScriptCommand(ClientWorker);
            return false;
        }


        // HTTP PUT.SUCCESS Response
        ClientWorker.addResponse(importPutSuccessResponse);
        function importPutSuccessResponse(responseString, e) {
            if (!/^put\.success/i.test(responseString))
                return false;
            ClientWorker.removeResponse(importPutSuccessResponse);
            self.module = {exports: {}};
            importScripts('keyspace/put/success/ks-client-put-success-response.js');
            module.exports.initClientKSPutSuccessResponse(ClientWorker);
            return false;
        }

    };
})();
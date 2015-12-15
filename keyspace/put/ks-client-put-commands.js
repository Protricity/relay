/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSPutCommands = function (ClientWorkerThread) {

        // HTTP PUT Command
        ClientWorkerThread.addCommand(importPutKeySpaceCommand);
        function importPutKeySpaceCommand(commandString, e) {
            if (!/^put\s+/im.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importPutKeySpaceCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/keyspace/ks-client-put-keyspace-command.js');
            module.exports.initClientKSPutKeySpaceCommand(ClientWorkerThread);
            return false;
        }

        // HTTP PUT.PUBLISH Command
        ClientWorkerThread.addCommand(importPutPublishCommand);
        function importPutPublishCommand(commandString, e) {
            if (!/^put\.publish\s+/im.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importPutPublishCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/publish/ks-client-put-publish-command.js');
            module.exports.initClientKSPutPublishCommand(ClientWorkerThread);
            //console.info("Loaded: keyspace/put/publish/ks-client-put-keyspace-command.js");
            return false;
        }

        // HTTP PUT.FORM Command
        ClientWorkerThread.addCommand(importPutFormCommand);
        function importPutFormCommand(commandString, e) {
            if (!/^put\s*$|^put\.form/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importPutFormCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/form/ks-client-put-form-command.js');
            module.exports.initClientKSPutFormCommand(ClientWorkerThread);
            return false;
        }


        // HTTP PUT.MANAGE Command
        ClientWorkerThread.addCommand(importPutManageCommand);
        function importPutManageCommand(commandString, e) {
            if (!/^put\.manage/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importPutManageCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/manage/ks-client-put-manage-command.js');
            module.exports.initClientKSPutManageCommand(ClientWorkerThread);
            return false;
        }


        // HTTP PUT.SCRIPT Command
        ClientWorkerThread.addCommand(importPutScriptCommand);
        function importPutScriptCommand(commandString, e) {
            if (!/^put\.script/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importPutScriptCommand);
            self.module = {exports: {}};
            importScripts('keyspace/put/script/ks-client-put-script-command.js');
            module.exports.initClientKSPutScriptCommand(ClientWorkerThread);
            return false;
        }


        // HTTP PUT.SUCCESS Response
        ClientWorkerThread.addResponse(importPutSuccessResponse);
        function importPutSuccessResponse(responseString, e) {
            if (!/^put\.success/i.test(responseString))
                return false;
            ClientWorkerThread.removeResponse(importPutSuccessResponse);
            self.module = {exports: {}};
            importScripts('keyspace/put/success/ks-client-put-success-response.js');
            module.exports.initClientKSPutSuccessResponse(ClientWorkerThread);
            return false;
        }

    };
})();
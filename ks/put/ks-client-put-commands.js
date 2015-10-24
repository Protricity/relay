/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutCommands = function(Client) {

    // HTTP PUT Command
    Client.addCommand(importPutKeySpaceCommand);
    function importPutKeySpaceCommand(commandString, e) {
        if(!/^put\s+/im.test(commandString))
            return false;
        Client.removeCommand(importPutKeySpaceCommand);
        self.module = {exports: {}};
        importScripts('ks/put/keyspace/ks-client-put-keyspace-command.js');
        module.exports.initClientKSPutKeySpaceCommand(Client);
        return false;
    }

    // HTTP PUT.PUBLISH Command
    Client.addCommand(importPutPublishCommand);
    function importPutPublishCommand(commandString, e) {
        if(!/^put\.publish\s+/im.test(commandString))
            return false;
        Client.removeCommand(importPutPublishCommand);
        self.module = {exports: {}};
        importScripts('ks/put/publish/ks-client-put-publish-command.js');
        module.exports.initClientKSPutPublishCommand(Client);
        //console.info("Loaded: ks/put/publish/ks-client-put-keyspace-command.js");
        return false;
    }

    // HTTP PUT.FORM Command
    Client.addCommand(importPutFormCommand);
    function importPutFormCommand(commandString, e) {
        if(!/^put$|^put\.form/i.test(commandString))
            return false;
        Client.removeCommand(importPutFormCommand);
        self.module = {exports: {}};
        importScripts('ks/put/form/ks-client-put-form-command.js');
        module.exports.initClientKSPutFormCommand(Client);
        return false;
    }


    // HTTP PUT.MANAGE Command
    Client.addCommand(importPutManageCommand);
    function importPutManageCommand(commandString, e) {
        if(!/^put\.manage/i.test(commandString))
            return false;
        Client.removeCommand(importPutManageCommand);
        self.module = {exports: {}};
        importScripts('ks/put/manage/ks-client-put-manage-command.js');
        module.exports.initClientKSPutManageCommand(Client);
        return false;
    }


    // HTTP PUT.SCRIPT Command
    Client.addCommand(importPutScriptCommand);
    function importPutScriptCommand(commandString, e) {
        if(!/^put\.script/i.test(commandString))
            return false;
        Client.removeCommand(importPutScriptCommand);
        self.module = {exports: {}};
        importScripts('ks/put/script/ks-client-put-script-command.js');
        module.exports.initClientKSPutScriptCommand(Client);
        return false;
    }


    // HTTP PUT.SUCCESS Response
    Client.addResponse(importPutSuccessResponse);
    function importPutSuccessResponse(responseString, e) {
        if(!/^put\.success/i.test(responseString))
            return false;
        Client.removeResponse(importPutSuccessResponse);
        self.module = {exports: {}};
        importScripts('ks/put/success/ks-client-put-success-response.js');
        module.exports.initClientKSPutSuccessResponse(Client);
        return false;
    }


};

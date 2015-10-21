/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutCommands = function(Client) {

    // HTTP PUT Command
    Client.addCommand(importPutSocketCommand);
    function importPutSocketCommand(commandString, e) {
        if(!/^put\s+/im.test(commandString))
            return false;
        Client.removeCommand(importPutSocketCommand);
        self.module = {exports: {}};
        importScripts('ks/put/socket/ks-client-put-socket-command.js');
        module.exports.initClientKSPutSocketCommand(Client);
        console.info("Loaded: ks/put/socket/ks-client-put-socket-command.js");
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
        console.info("Loaded: ks/put/form/ks-client-put-form-command.js");
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
        console.info("Loaded: ks/put/manage/ks-client-put-manage-command.js");
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
        console.info("Loaded: ks/put/script/ks-client-put-script-command.js");
        return false;
    }


};

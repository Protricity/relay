/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSCommands = function(Client) {

    // HTTP GET Command
    Client.addCommand(importGETCommand);
    Client.addResponse(importGETCommand);
    function importGETCommand(commandString, e) {
        if(!/^(get|http)/i.test(commandString))
            return false;
        Client.removeCommand(importGETCommand);
        Client.removeResponse(importGETCommand);
        self.module = {exports: {}};
        importScripts('ks/get/ks-client-get-commands.js');
        console.info("Loaded: ks/get/ks-client-get-commands.js");
        module.exports.initClientKSGetCommands(Client);
        return false;
    }


    // HTTP PUT Command
    Client.addCommand(importPUTCommand);
    Client.addResponse(importPUTCommand);
    function importPUTCommand(commandString, e) {
        if(!/^put/i.test(commandString))
            return false;
        Client.removeCommand(importPUTCommand);
        Client.removeResponse(importPUTCommand);
        self.module = {exports: {}};
        importScripts('ks/put/ks-client-put-commands.js');
        module.exports.initClientKSPutCommands(Client);
        console.info("Loaded: ks/put/ks-client-put-commands.js");
        return false;
    }


    // HTTP Response
    Client.addResponse(importAUTHCommand);
    function importAUTHCommand(commandString, e) {
        if(!/^auth/i.test(commandString))
            return false;
        Client.removeCommand(importAUTHCommand);
        Client.removeResponse(importAUTHCommand);
        self.module = {exports: {}};
        importScripts('ks/auth/ks-client-auth-command.js');
        module.exports.initClientAuthCommands(Client);
        console.info("Loaded: ks/auth/ks-client-auth-command.js");
        return false;
    }

};

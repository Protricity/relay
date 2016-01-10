/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientUICommands = function (ClientWorkerThread) {

        // Channel Contacts Commands
        ClientWorkerThread.addCommand(importUIContactsCommands);
        ClientWorkerThread.addResponse(importUIContactsCommands);
        function importUIContactsCommands(commandString, e) {
            if (!/^(ui\.)?contacts/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importUIContactsCommands);
            ClientWorkerThread.removeResponse(importUIContactsCommands);
            self.module = {exports: {}};
            importScripts('ui/contacts/ui-client-contacts-commands.js');
            module.exports.initClientUIContactsCommands(ClientWorkerThread);
            return false;
        }



        // Channel Login Commands
        ClientWorkerThread.addCommand(importUILoginCommands);
        function importUILoginCommands(commandString, e) {
            if (!/^(ui\.)?login/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importUILoginCommands);
            self.module = {exports: {}};
            importScripts('ui/login/ui-client-login-commands.js');
            module.exports.initClientUILoginCommands(ClientWorkerThread);
            return false;
        }

    };
})();
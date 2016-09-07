/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientUICommands = function (ClientWorkerThread) {

        // UI Contacts Commands
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


        // UI Login Commands
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


        // UI Menu Commands
        ClientWorkerThread.addCommand(importUILoMenuCommands);
        function importUILoMenuCommands(commandString, e) {
            if (!/^(ui\.)?menu/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importUILoMenuCommands);
            self.module = {exports: {}};
            importScripts('ui/menu/ui-client-menu-commands.js');
            module.exports.initClientUIMenuCommands(ClientWorkerThread);
            return false;
        }


        // UI About Commands
        ClientWorkerThread.addCommand(importAboutCommand);
        function importAboutCommand(commandString, e) {
            if (!/^(ui\.)?about/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importAboutCommand);
            importScripts('ui/about/about.js');
            module.exports.initClientUIAboutCommands(ClientWorkerThread);
            return false;
        }
    };
})();
/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientPGPCommands = function (ClientWorker) {

        // PGP.KEYGEN Command
        ClientWorker.addCommand(importKeyGenCommand);
        ClientWorker.addResponse(importKeyGenCommand);
        function importKeyGenCommand(commandString, e) {
            if (!/^pgp\.keygen/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importKeyGenCommand);
            ClientWorker.removeResponse(importKeyGenCommand);
            self.module = {exports: {}};
            importScripts('pgp/keygen/pgp-client-keygen-command.js');
            module.exports.initClientPGPKeyGenCommand(ClientWorker);
            return false;
        }

        // PGP.MANAGE Command
        ClientWorker.addCommand(importPGPManageCommand);
        function importPGPManageCommand(commandString, e) {
            if (!/^pgp\.manage/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPGPManageCommand);
            self.module = {exports: {}};
            importScripts('pgp/manage/pgp-client-manage-command.js');
            module.exports.initClientPGPManageCommand(ClientWorker);
            return false;
        }

        // PGP.LIST Command
        ClientWorker.addCommand(importPGPListCommand);
        function importPGPListCommand(commandString, e) {
            if (!/^pgp\.list/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPGPListCommand);
            self.module = {exports: {}};
            importScripts('pgp/list/pgp-client-list-command.js');
            module.exports.initClientPGPListCommand(ClientWorker);
            return false;
        }

        // PGP.CONTACT Command
        ClientWorker.addCommand(importPGPContactCommand);
        function importPGPContactCommand(commandString, e) {
            if (!/^pgp\.contact/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPGPContactCommand);
            self.module = {exports: {}};
            importScripts('pgp/contact/pgp-client-contact-command.js');
            module.exports.initClientPGPContactCommand(ClientWorker);
            return false;
        }

        // PGP.DELETE Command
        ClientWorker.addCommand(importPGPDeleteCommand);
        function importPGPDeleteCommand(commandString, e) {
            if (!/^pgp\.delete/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPGPDeleteCommand);
            self.module = {exports: {}};
            importScripts('pgp/delete/pgp-client-delete-command.js');
            module.exports.initClientPGPDeleteCommand(ClientWorker);
            return false;
        }

        // PGP.IMPORT Command
        ClientWorker.addCommand(importPGPImportCommand);
        ClientWorker.addResponse(importPGPImportCommand);
        function importPGPImportCommand(commandString, e) {
            if (!/^pgp\.import/i.test(commandString))
                return false;
            ClientWorker.removeCommand(importPGPImportCommand);
            ClientWorker.removeResponse(importPGPImportCommand);
            self.module = {exports: {}};
            importScripts('pgp/import/pgp-client-import-command.js');
            module.exports.initClientPGPImportCommands(ClientWorker);
            return false;
        }

        //// PGP.DEFAULT Command
        //Client.addCommand(importPGPDefaultCommand);
        //Client.addResponse(importPGPDefaultCommand);
        //function importPGPDefaultCommand(commandString, e) {
        //    if (!/^pgp\.default/i.test(commandString))
        //        return false;
        //    Client.removeCommand(importPGPDefaultCommand);
        //    Client.removeResponse(importPGPDefaultCommand);
        //    self.module = {exports: {}};
        //    importScripts('pgp/default/pgp-client-default-command.js');
        //    module.exports.initClientPGPDefaultCommands(Client);
        //    return false;
        //}

        //// PGP.AUTH and PGP.VALIDATE Command
        //Client.addCommand(importPGPAuthCommand);
        //Client.addResponse(importPGPAuthCommand);
        //function importPGPAuthCommand(commandString, e) {
        //    if (!/^pgp\.(auth|validate)/i.test(commandString))
        //        return false;
        //    Client.removeCommand(importPGPAuthCommand);
        //    Client.removeResponse(importPGPAuthCommand);
        //    self.module = {exports: {}};
        //    importScripts('pgp/auth/pgp-client-auth-command.js');
        //    module.exports.initClientPGPAuthCommands(Client);
        //    return false;
        //}

    };
})();
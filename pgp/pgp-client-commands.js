/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientPGPCommands = function (Client) {

        // PGP.KEYGEN Command
        Client.addCommand(importKeyGenCommand);
        Client.addResponse(importKeyGenCommand);
        function importKeyGenCommand(commandString, e) {
            if (!/^pgp\.keygen/i.test(commandString))
                return false;
            Client.removeCommand(importKeyGenCommand);
            Client.removeResponse(importKeyGenCommand);
            self.module = {exports: {}};
            importScripts('pgp/keygen/pgp-client-keygen-command.js');
            module.exports.initClientPGPKeyGenCommand(Client);
            return false;
        }

        // PGP.MANAGE Command
        Client.addCommand(importPGPManageCommand);
        function importPGPManageCommand(commandString, e) {
            if (!/^pgp\.manage/i.test(commandString))
                return false;
            Client.removeCommand(importPGPManageCommand);
            self.module = {exports: {}};
            importScripts('pgp/manage/pgp-client-manage-command.js');
            module.exports.initClientPGPManageCommand(Client);
            return false;
        }

        // PGP.DELETE Command
        Client.addCommand(importPGPDeleteCommand);
        function importPGPDeleteCommand(commandString, e) {
            if (!/^pgp\.delete/i.test(commandString))
                return false;
            Client.removeCommand(importPGPDeleteCommand);
            self.module = {exports: {}};
            importScripts('pgp/delete/pgp-client-delete-command.js');
            module.exports.initClientPGPDeleteCommand(Client);
            return false;
        }

        // PGP.IMPORT Command
        Client.addCommand(importPGPImportCommand);
        Client.addResponse(importPGPImportCommand);
        function importPGPImportCommand(commandString, e) {
            if (!/^pgp\.import/i.test(commandString))
                return false;
            Client.removeCommand(importPGPImportCommand);
            Client.removeResponse(importPGPImportCommand);
            self.module = {exports: {}};
            importScripts('pgp/import/pgp-client-import-command.js');
            module.exports.initClientPGPImportCommands(Client);
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
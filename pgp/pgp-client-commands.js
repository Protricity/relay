/**
 * Ari 7/2/2015.
 */
if (!module) var module = {exports:{}};
module.exports.initClientPGPCommands = function(Client) {

    // PGP.KEYGEN Command
    Client.addCommand(importKeyGenCommand);
    Client.addResponse(importKeyGenCommand);
    function importKeyGenCommand(commandString, e) {
        if(!/^pgp\.keygen/i.test(commandString))
            return false;
        Client.removeCommand(importKeyGenCommand);
        Client.removeResponse(importKeyGenCommand);
        self.module = {exports: {}};
        importScripts('pgp/keygen/pgp-client-keygen-command.js');
        module.exports.initClientPGPKeyGenCommand(Client);
        return false;
    }

    // PGP.MANAGE Command
    Client.addCommand(importManageCommand);
    function importManageCommand(commandString, e) {
        if(!/^pgp\.manage/i.test(commandString))
            return false;
        Client.removeCommand(importManageCommand);
        self.module = {exports: {}};
        importScripts('pgp/manage/pgp-client-manage-command.js');
        module.exports.initClientPGPManageCommand(Client);
        return false;
    }

    // PGP.REGISTER Command
    Client.addCommand(importRegisterCommand);
    Client.addResponse(importRegisterCommand);
    function importRegisterCommand(commandString, e) {
        if(!/^pgp\.(un)?register/i.test(commandString))
            return false;
        Client.removeCommand(importRegisterCommand);
        Client.removeResponse(importRegisterCommand);
        self.module = {exports: {}};
        importScripts('pgp/register/pgp-client-register-command.js');
        module.exports.initClientPGPRegisterCommands(Client);
        return false;
    }

    // PGP.AUTH and PGP.VALIDATE Command
    Client.addCommand(importAuthCommand);
    Client.addResponse(importAuthCommand);
    function importAuthCommand(commandString, e) {
        if(!/^pgp\.(auth|validate)/i.test(commandString))
            return false;
        Client.removeCommand(importAuthCommand);
        Client.removeResponse(importAuthCommand);
        self.module = {exports: {}};
        importScripts('pgp/auth/pgp-client-auth-command.js');
        module.exports.initClientPGPAuthCommands(Client);
        return false;
    }

    // PGP.DEFAULT Command
    Client.addCommand(importDefaultCommand);
    Client.addResponse(importDefaultCommand);
    function importDefaultCommand(commandString, e) {
        if(!/^pgp\.default/i.test(commandString))
            return false;
        Client.removeCommand(importDefaultCommand);
        Client.removeResponse(importDefaultCommand);
        self.module = {exports: {}};
        importScripts('pgp/default/pgp-client-default-command.js');
        module.exports.initClientPGPDefaultCommands(Client);
        return false;
    }

};
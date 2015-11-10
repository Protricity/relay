/**
 * Created by ari on 10/5/2015.
 */

if(typeof module === 'object') (function() {
    module.exports.initClientAppCommands = function (Client) {

        // About Window Commands
        Client.addCommand(importAboutCommand);
        function importAboutCommand(commandString, e) {
            if (!/^about/i.test(commandString))
                return false;
            Client.removeCommand(importAboutCommand);
            importScripts('app/tool/about/about.js');
            module.exports.initClientAppAboutCommands(Client);
            return false;
        }

        // About Window Commands
        Client.addCommand(importVoteCommand);
        function importVoteCommand(commandString, e) {
            if (!/^vote/i.test(commandString))
                return false;
            Client.removeCommand(importVoteCommand);
            importScripts('app/social/vote/vote.js');
            module.exports.initClientAppSocialVoteCommands(Client);
            return false;
        }


    };
})();
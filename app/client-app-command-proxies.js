/**
 * Created by ari on 10/5/2015.
 */

if(typeof module === 'object') (function() {
    module.exports.initClientAppCommands = function (Client) {


        // Vote Window Commands
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
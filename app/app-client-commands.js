/**
 * Created by ari on 10/5/2015.
 */

if (!module) var module = {exports:{}};
module.exports.initClientAppCommands = function(Client) {

    // Feed Commands
    Client.addCommand(importFeedCommands);
    function importFeedCommands(commandString, e) {
        if (!/^feed/i.test(commandString))
            return false;
        Client.removeCommand(importFeedCommands);
        importScripts('app/social/feed/feed-client-commands.js');
        module.exports.initClientCommands(Client);
        console.info("Loaded: app/social/feed/feed-client-commands.js");
        return false;
    }

};
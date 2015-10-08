/**
 * Created by ari on 10/5/2015.
 */
if(!exports) var exports = {};
exports.initClientAppCommands = function(Client) {

    // Chat Commands
    Client.addCommand(importChatCommands);
    Client.addResponse(importChatCommands);
    function importChatCommands(commandString, e) {
        if (!/^(join|leave|message|chat|nick)/i.test(commandString))
            return false;
        Client.removeCommand(importChatCommands);
        Client.removeResponse(importChatCommands);
        importScripts('app/social/chat/chat-client-commands.js');
        return false;
    }


    // Feed Commands
    Client.addCommand(importFeedCommands);
    function importFeedCommands(commandString, e) {
        if (!/^feed/i.test(commandString))
            return false;
        Client.removeCommand(importFeedCommands);
        importScripts('app/social/feed/feed-client-commands.js');
        return false;
    }
};
/**
 * Created by ari on 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientChannelCommands = function (ClientWorkerThread) {

        // Channel Chat Commands
        ClientWorkerThread.addCommand(importChannelChatCommands);
        ClientWorkerThread.addResponse(importChannelChatCommands);
        function importChannelChatCommands(commandString, e) {
            if (!/^(?:channel\.)?(chat)/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importChannelChatCommands);
            ClientWorkerThread.removeResponse(importChannelChatCommands);
            self.module = {exports: {}};
            importScripts('channel/chat/channel-client-chat-commands.js');
            module.exports.initClientChannelChatCommands(ClientWorkerThread);
            return false;
        }

        // Channel Suggest Commands
        ClientWorkerThread.addCommand(importChannelSuggestCommands);
        ClientWorkerThread.addResponse(importChannelSuggestCommands);
        function importChannelSuggestCommands(commandString, e) {
            if (!/^(?:channel\.)?suggest/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importChannelSuggestCommands);
            ClientWorkerThread.removeResponse(importChannelSuggestCommands);
            self.module = {exports: {}};
            importScripts('channel/suggest/channel-client-suggest-commands.js');
            module.exports.initClientChannelSuggestCommands(ClientWorkerThread);
            return false;
        }


        // Channel Subscribe Commands
        ClientWorkerThread.addCommand(importChannelSubscribeCommands);
        ClientWorkerThread.addResponse(importChannelSubscribeCommands);
        function importChannelSubscribeCommands(commandString, e) {
            if (!/^(?:channel\.)?(subscribe|join|leave|userlist|nick)/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importChannelSubscribeCommands);
            ClientWorkerThread.removeResponse(importChannelSubscribeCommands);
            self.module = {exports: {}};
            importScripts('channel/subscribe/channel-client-subscribe-commands.js');
            //console.log('Loaded: channel/subscribe/channel-client-subscribe-commands.js');
            module.exports.initClientChannelSubscribeCommands(ClientWorkerThread);
            return false;
        }

    };
})();

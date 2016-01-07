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

        // Channel Search Commands
        ClientWorkerThread.addCommand(importChannelSearchCommands);
        ClientWorkerThread.addResponse(importChannelSearchCommands);
        function importChannelSearchCommands(commandString, e) {
            if (!/^(?:channel\.)?search/i.test(commandString))
                return false;
            ClientWorkerThread.removeCommand(importChannelSearchCommands);
            ClientWorkerThread.removeResponse(importChannelSearchCommands);
            self.module = {exports: {}};
            importScripts('channel/search/channel-client-search-commands.js');
            module.exports.initClientChannelSearchCommands(ClientWorkerThread);
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

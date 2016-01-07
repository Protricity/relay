/**
 * Channel Chat Commands
 * 
 * Provides command and response handling for CHANNEL.CHAT
 */
 
if(typeof module === 'object') (function() {
    
    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientChannelChatCommands = function (ClientWorkerThread) {
        
        // Add Command/Response Handlers     
        ClientWorkerThread.addCommand(channelChatCommand);
        ClientWorkerThread.addResponse(channelChatResponse);
        ClientWorkerThread.addResponse(eventListener, true);

        self.module = {exports: {}};
        importScripts('channel/chat/render/chat-window.js');
        var chatExports = self.module.exports;

        var refreshTimeout = null;
        function eventListener(responseString) {
            var match = /^event\s(?:channel\.)?userlist\.(\w+)(?:\s(\S+))?\n([\s\S]+)$/im.exec(responseString);
            if (!match)
                return false;
            var mode = match[1];
            var channel = match[2] || null;
            var subscriptionList = match[3].split(/\n+/img);

            if(refreshTimeout)
                clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(function() {
                // console.info("Refreshing Chat List: " + responseString, subscriptionList);
                renderChatWindow(channel, function () {
                    chatExports.renderChatUserList(channel, subscriptionList, function (html) {
                        ClientWorkerThread.render(html);
                    });
                });
            }, 500);

            return false;
        }

        function channelChatCommand(commandString) {
            var match = /^(channel\.)?chat\s*([\s\S]*)$/im.exec(commandString);
            if (!match)
                return false;

            if(!match[1])
                commandString = "CHANNEL." + commandString;
            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }

        function channelChatResponse(responseString) {
            var match = /^(?:channel\.)?chat\s+(\S+)/im.exec(responseString);
            if (!match)
                return false;

            var channel = match[1];
            renderChatWindow(channel);
            //console.info("Channel has Activity: " + channelPath);

            chatExports.renderChatMessage(responseString, function (html) {
                ClientWorkerThread.render(html);
            });
            return true;
        }

        var activeChannels = [];
        function renderChatWindow(channelPath, callback) {
            var channelPathLowerCase = channelPath.toLowerCase();

            if (activeChannels.indexOf(channelPathLowerCase) === -1) {
                chatExports.renderChatWindow(channelPath, function (html) {
                    ClientWorkerThread.render(html);
                    activeChannels.push(channelPathLowerCase);
                    if(callback)
                        callback();

                    var ClientSubscriptions = self.ClientSubscriptions || (function() {
                        self.module = {exports: {}};
                        importScripts('client/subscriptions/client-subscriptions.js');
                        return self.ClientSubscriptions = self.module.exports.ClientSubscriptions;
                    })();

                    var userList = ClientSubscriptions.getChannelUserList('chat', channelPath);

                    chatExports.renderChatUserList(channelPath, userList, function(html) {
                        ClientWorkerThread.render(html);
                    });
                });

            } else {
                if(callback)
                    callback();
            }
        }

    };
})();

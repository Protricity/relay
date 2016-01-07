/**
 * Channel Subscribe Commands
 * 
 * Provides command and response handling for CHANNEL.SUBSCRIBE
 */
 
if(typeof module === 'object') (function() {
    
    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientChannelSubscribeCommands = function (ClientWorkerThread) {
        
        // Add Command/Response Handlers     
        ClientWorkerThread.addCommand(channelSubscribeCommand);
        ClientWorkerThread.addResponse(channelSubscribeResponse);

        ClientWorkerThread.addResponse(channelJoinCommand);
        ClientWorkerThread.addResponse(channelLeaveCommand);
        ClientWorkerThread.addResponse(channelUserlistResponse);


        // Default Subscription Mode
        var DEFAULT_MODE = 'event';

        function channelJoinCommand(commandString) {
            var match = /^(?:channel\.)?join\s+(.*)$/im.exec(commandString);
            if (!match)
                return false;

            var content = match[1];
            return channelSubscribeCommand("CHANNEL.SUBSCRIBE." + DEFAULT_MODE.toUpperCase() + " " + content);
        }

        function channelLeaveCommand(commandString) {
            var match = /^(?:channel\.)?leave\s+(.*)$/im.exec(commandString);
            if (!match)
                return false;

            var content = match[1];

            // TODO: unsubscribe all?
            return channelSubscribeCommand("CHANNEL.UNSUBSCRIBE." + DEFAULT_MODE.toUpperCase() + " " + content);
        }


        // USERLIST Response
        function channelUserlistResponse(commandResponse) {
            var match = /^(?:channel\.)?userlist\.(\w+)(?:\s(\S+))?\n([\s\S]+)$/im.exec(commandResponse);
            if (!match)
                return false;
            var mode = match[1];
            var channel = match[2] || null;
            var subscriptionList = match[3].split(/\n+/img);

            var ClientSubscriptions = self.ClientSubscriptions || (function() {
                self.module = {exports: {}};
                importScripts('client/subscriptions/client-subscriptions.js');
                return self.ClientSubscriptions = self.module.exports.ClientSubscriptions;
            })();

            ClientSubscriptions.handleClientUserList(commandResponse);

            // Send event to signal user list refresh
            ClientWorkerThread.processResponse("EVENT " + commandResponse);

            return true;
        }


        // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
        // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
        // CHANNEL.CHAT /state/az omg u guiez
        // CHAT /state/az omg u guiez

        function channelSubscribeCommand(commandString, e) {
            var match = /^channel\.(un)?subscribe(?:\.(\w+))?\s+(\S+)\s*([\s\S]+)?$/im.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var unsubscribe = (match[1]||'').toLowerCase() === 'un';
            var mode = (match[2] || DEFAULT_MODE).toLowerCase();
            var channel = match[3];
            var argString = match[4];
//             console.log(match);

            // Update Settings
            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;

            var settingsCommandStringPrefix = "CHANNEL.SUBSCRIBE." + mode.toUpperCase() + ' ' + channel;
            var settingsCommandString = settingsCommandStringPrefix + (argString ? ' ' + argString : "");
            SettingsDB.getSettings("onconnect:subscriptions", function(subscriptionSettings) {
                if(typeof subscriptionSettings.commands === 'undefined')
                    subscriptionSettings.commands = [];
                var commands = subscriptionSettings.commands;
                var oldSubscriptionPos = -1;
                for(var i=0; i<commands.length; i++) {
                    if(commands[i].indexOf(settingsCommandStringPrefix) === 0)
                        oldSubscriptionPos = i;
                    //match = /^(?:channel\.)?subscribe(?:\.(\w+))?/i.exec(commands[i]);
                    //if(match && (match[1] || '').toLowerCase() === mode)
                    //    oldSubscriptionPos = i;
                }
                if(unsubscribe) {
                    if(oldSubscriptionPos >= 0) {
                        console.log("Removing Auto-Subscription: ", settingsCommandString);
                        commands.splice(oldSubscriptionPos, 1);
                    } else {
                        console.error("Old subscription not found in settings");
                    }

                } else {
                    if(oldSubscriptionPos >= 0) {
                        if(commands[oldSubscriptionPos] !== settingsCommandString) {
                            console.log("Replacing Auto-Subscription (" + oldSubscriptionPos + "): ", settingsCommandString);
                            commands[oldSubscriptionPos] = settingsCommandString;
                        } else {
                            //console.log("Ignoring unchanged Auto-Subscription (" + oldSubscriptionPos + "): ", settingsCommandStringPrefix);
                        }
                    } else {
                        console.info("Adding Auto-Subscription: ", settingsCommandString);
                        commands.push(settingsCommandString);
                    }
                }
                SettingsDB.updateSettings(subscriptionSettings);
            });

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }


        /**
         * Handles Command: CHANNEL.SUBSCRIBE [channel] [arg]
         * @param {string} responseString The response string to process
         * @param {object} e The response Event
         * @return {boolean} true if handled otherwise false
         **/
        function channelSubscribeResponse(responseString, e) {
            var match = /^channel\.(un|re)?subscribe\.(\w+)?\s+(\S+)\s*([\S\s]*)$/im.exec(responseString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var ClientSubscriptions = self.ClientSubscriptions || (function() {
                self.module = {exports: {}};
                importScripts('client/subscriptions/client-subscriptions.js');
                return self.ClientSubscriptions = self.module.exports.ClientSubscriptions;
            })();

            ClientSubscriptions.handleSubscriptionResponse(responseString, e);
            ClientWorkerThread.processResponse("EVENT " + responseString); // CHANNEL.SUBSCRIPTION.UPDATE " + channel + " " + mode + " " + argString);

            return true;
        }


        var chatExports = null;
        function getChatExports() {
            if(chatExports)
                return chatExports;
            self.module = {exports: {}};
            importScripts('channel/chat/render/chat-window.js');
            return chatExports = self.module.exports;
        }


        //
        //var activeSubscribes = [];
        //function renderSubscribeWindow(pgp_id_to, pgp_id_from, switchOnResponse, callback) {
        //    var uid = pgp_id_to + ':' + pgp_id_from;
        //    if(switchOnResponse)
        //        uid = pgp_id_from + ':' + pgp_id_to;
        //
        //    if (activeSubscribes.indexOf(uid) === -1) {
        //        getSubscribeExports().renderSubscribeWindow(pgp_id_to, pgp_id_from, switchOnResponse,
        //            function (html) {
        //                ClientWorkerThread.render(html);
        //                activeSubscribes.push(uid);
        //                if(callback)
        //                    callback();
        //            }
        //        );
        //
        //        // Check for missing public keys
        //        requestPublicKeyContent(pgp_id_to);
        //        requestPublicKeyContent(pgp_id_from);
        //
        //    } else {
        //        ClientWorkerThread.postResponseToClient("FOCUS channel-subscribe:" + uid);
        //        if(callback)
        //            callback();
        //    }
        //}

    };
})();

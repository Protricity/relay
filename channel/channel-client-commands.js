/**
 * Created by ari on 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientChannelCommands = function (ClientWorkerThread) {

        ClientWorkerThread.addCommand(subscribeCommand);
        ClientWorkerThread.addResponse(subscribeResponse);

        ClientWorkerThread.addCommand(chatCommand);
        ClientWorkerThread.addResponse(chatResponse);

        ClientWorkerThread.addCommand(messageCommand);
        ClientWorkerThread.addResponse(messageResponse);

        ClientWorkerThread.addResponse(userlistResponse);

        //// NICK Command - No need just resubscribe
        //ClientWorkerThread.addCommand(nickCommand);

        //ClientWorkerThread.addCommand(joinCommand);
        //ClientWorkerThread.addResponse(joinResponse);

        //ClientWorkerThread.addCommand(leaveCommand);
        //ClientWorkerThread.addResponse(leaveResponse);

        //ClientWorkerThread.addCommand(keyListCommand);
        //ClientWorkerThread.addResponse(keyListResponse);

        //ClientWorkerThread.addResponse(nickResponse);

        var ClientSubscriptions = self.ClientSubscriptions || (function() {
            self.module = {exports: {}};
            importScripts('client/subscriptions/client-subscriptions.js');
            return self.ClientSubscriptions = self.module.exports.ClientSubscriptions;
        })();


        function subscribeCommand(commandString) {
            var match = /^channel\.(un)?subscribe(?:\.(\w+))?\s+(\S+)\s*([\s\S]+)?$/im.exec(commandString);
            if (!match)
                return false;

            var unsubscribe = (match[1]||'').toLowerCase() === 'un';
            var mode = (match[2] || '').toLowerCase();
            var channel = match[3];
            var argString = match[4];
//             console.log(match);

            // Update Settings
            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;

            var settingsCommandStringPrefix = "CHANNEL.SUBSCRIBE" + (mode ? '.' + mode.toUpperCase() : '') + ' ' + channel;
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
                        console.log("Adding Auto-Subscription: ", settingsCommandString);
                        commands.push(settingsCommandString);
                    }
                }
                SettingsDB.updateSettings(subscriptionSettings);
            });

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }


        // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
        // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
        // CHANNEL.CHAT /state/az omg u guiez
        // CHAT /state/az omg u guiez
        function subscribeResponse(responseString) {
            var match = /^channel\.(un|re)?subscribe\.(\w+)?\s+(\S+)\s*([\S\s]*)$/im.exec(responseString);
            if (!match)
                return false;

            ClientSubscriptions.add(responseString);
            ClientWorkerThread.processResponse("EVENT " + responseString); // CHANNEL.SUBSCRIPTION.UPDATE " + channel + " " + mode + " " + argString);

            return true;
        }

        function chatCommand(commandString) {
            var match = /^(?:channel\.)?chat\s+([^\s]+)\s*([\s\S]*)$/im.exec(commandString);
            if (!match)
                return false;

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }

        function chatResponse(responseString) {
            var match = /^(?:channel\.)?chat\s+(\S+)/im.exec(responseString);
            if (!match)
                return false;

            var channel = match[1];
            renderChatWindow(channel);
            //console.info("Channel has Activity: " + channelPath);

            getChatExports().renderChatMessage(responseString, function (html) {
                ClientWorkerThread.render(html);
            });
            return true;
        }

        // USERLIST Response
        function userlistResponse(commandResponse) {
            var match = /^(?:channel\.)?userlist\.(\w+)\s+(\S+)\s+([\s\S]+)$/im.exec(commandResponse);
            if (!match)
                return false;
            var mode = match[1];
            var channel = match[2];
            var subscriptionList = match[3].split(/\s+/img);

            // TODO: store local and remote subscriptions together? nah, need to tell appart
            ChannelClientSubscriptions.setChannelSubscriptionList(channel, mode, subscriptionList);

            switch(mode.toLowerCase()) {
                case 'chat':
                    renderChatWindow(channel);
                    getChatExports().renderChatUserList(channel, subscriptionList, function (html) {
                        ClientWorkerThread.render(html);
                    });
                    break;
            }
            return true;
        }

        function messageCommand(commandString) {
            var match = /^message\s+(\S+)\s*([\s\S]*)$/im.exec(commandString);
            if (!match)
                return false;

            var username = match[1];
            var content = match[2];

            renderMessageWindow(username);


            if(content) {
                var formattedCommandString = "MESSAGE " + username + 
                    " " + Date.now() + " " + content; 
                ClientWorkerThread.sendWithSocket(formattedCommandString);
            }
            return true;
        }

        function messageResponse(responseString) {
            var match = /^message\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(responseString);
            if(!match)
                return false;

            var username = match[1];
            var timestamp = parseInt(match[2]);
            var message = match[3];

            //var username = match[2];
            //var content = fixPGPMessage(match[3]);
            renderMessageWindow(username);
            getMessageExports().renderMessage(responseString, function (html, username) {
                ClientWorkerThread.render(html);
            });
            return true;
        }

        var activeChannels = [];
        function renderChatWindow(channelPath, publicChannel) {
            var channelPathLowerCase = channelPath.toLowerCase();

            if (activeChannels.indexOf(channelPathLowerCase) === -1) {
                getChatExports().renderChatWindow(channelPath, function (html) {
                    ClientWorkerThread.render(html);
                    activeChannels.push(channelPathLowerCase);
                });
            }
        }


        var activeMessages = [];
        function renderMessageWindow(username) {
            if (activeMessages.indexOf(username) === -1) {
                getMessageExports().renderMessageWindow(username, function (html) {
                    ClientWorkerThread.render(html);
                    activeMessages.push(username);
                });
            }
        }


        var messageExports = null;
        function getMessageExports() {
            if(messageExports)
                return messageExports;
            self.module = {exports: {}};
            importScripts('channel/message/render/message-window.js');
            return messageExports = self.module.exports;
        }


        var chatExports = null;
        function getChatExports() {
            if(chatExports)
                return chatExports;
            self.module = {exports: {}};
            importScripts('channel/chat/render/chat-window.js');
            return chatExports = self.module.exports;
        }

    };
})();


//
//function nickResponse(responseString) {
//    var match = /^(?:channel\.)?nick\s+(\S+)\s+(\S+)/im.exec(responseString);
//    if (!match)
//        return false;
//
//    var old_username = match[1];
//    var new_username = match[2];
//    var found = false;
//    for (var channelPathLowerCase in channelUsers) {
//        if (channelUsers.hasOwnProperty(channelPathLowerCase)) {
//            (function (channelPathLowerCase) {
//                var userList = channelUsers[channelPathLowerCase];
//                var pos = userList.indexOf(old_username);
//                if (pos >= 0) {
//                    userList[pos] = new_username;
//
//                    // Render Nick Change Event
//                    getChatExports().renderChatNickChange(responseString, channelPathLowerCase, function (html) {
//                        ClientWorkerThread.render(html);
//                    });
//
//                    // Render New User List
//                    getChatExports().renderChatUserList(channelPathLowerCase, userList, function (html) {
//                        ClientWorkerThread.render(html);
//                    });
//
//                    // TODO: refresh private message
//
//                    found = true;
//                }
//            })(channelPathLowerCase);
//        }
//    }
//    if (found)
//        return true;
//
//    return true;
//    // throw new Error("Nick not found in user list: " + old_username);
//}


//// NICK Command - No need just resubscribe
//function nickCommand(commandString) {
//    var match = /^(?:channel\.)?nick\s+([a-z0-9_-]{2,64})$/im.exec(commandString);
//    if(!match)
//        return false;
//
//    var newNick = match[1];
//
//    self.module = {exports: {}};
//    importScripts('client/settings/settings-db.js');
//    var SettingsDB = self.module.exports.SettingsDB;
//
//    // Update Settings
//    SettingsDB.getSettings("channel.nick", function(nickSettings) {
//        if(nickSettings.username)
//            nickSettings.old_username = nickSettings.username;
//        nickSettings.username = newNick;
//        SettingsDB.updateSettings(nickSettings);
//    });
//
////             console.log("Changing Username: " + commandString);
//    ClientWorkerThread.sendWithSocket(commandString);
//    return true;
//}




//
//function joinCommand(commandString) {
//    var match = /^(?:channel\.)?join(\.public)?\s+(\S+)/im.exec(commandString);
//    if (!match)
//        return false;
//
//    var publicChannel = match[1].length > 0;
//    var channelPath = match[2];
//
//    // Update Settings
//    self.module = {exports: {}};
//    importScripts('client/settings/settings-db.js');
//    var SettingsDB = self.module.exports.SettingsDB;
//    SettingsDB.getSettings("channel:" + channelPath.toLowerCase(), function(channelSettings) {
//        channelSettings.auto_join = 1;
//        channelSettings.name_original_case = channelPath;
//        SettingsDB.updateSettings(channelSettings);
//    });
//
//    ClientWorkerThread.sendWithSocket(commandString);
//
//    var subscribeCommandString;
//    // TODO: subscribe command
//
//
//    renderChatWindow(channelPath, true);
//    ClientWorkerThread.postResponseToClient("FOCUS chat:" + channelPath.toLowerCase());
//    return true;
//}

//        function joinResponse(responseString) {
//            var match = /^(?:channel\.)?join\s+(\S+)\s+(\S+)\s+/im.exec(responseString);
//            if (!match)
//                return false;
//
//            //var args = responseString.split(/\s/);
//            var channelPath = match[1];
//            var username = match[2];
//            renderChatWindow(channelPath);
//
////             console.info("Joined Channel: " + channelPath);
//            getChatExports().renderChatActionEntry(responseString, function (html) {
//                ClientWorkerThread.render(html);
//            });
//
//            var userList = channelUsers[channelPath.toLowerCase()];
//            if (!userList)
//                userList = channelUsers[channelPath.toLowerCase()] = [];
//            if (userList.indexOf(username) == -1) {
//                userList.push(username);
//
//                userList.sort();
//                getChatExports().renderChatUserList(channelPath, userList, function (html) {
//                    ClientWorkerThread.render(html);
//                });
//            }
//
//            return true;
//        }
//
//        // LEAVE Command
//        function leaveCommand(commandString) {
//            var match = /^(?:channel\.)?leave\s+(\S+)/im.exec(commandString);
//            if (!match)
//                return false;
//            var channelPath = match[1];
//
//            // Update Settings
//            self.module = {exports: {}};
//            importScripts('client/settings/settings-db.js');
//            var SettingsDB = self.module.exports.SettingsDB;
//            SettingsDB.getSettings("channel:" + channelPath, function(channelSettings) {
//                delete channelSettings.auto_join;
//                // TODO: delete empty channel settings
//                SettingsDB.updateSettings(channelSettings);
//            });
//
//            ClientWorkerThread.postResponseToClient("CLOSE chat:" + channelPath.toLowerCase());
//
//            ClientWorkerThread.sendWithSocket(commandString);
//            return true;
//        }
//
//        function leaveResponse(responseString) {
//            var match = /^(?:channel\.)?leave\s+(\S+)\s+(\S+)\s+/im.exec(responseString);
//            if (!match)
//                return false;
//            var channelPath = match[1];
//            var username = match[2];
//
//            renderChatWindow(channelPath);
//
//            console.info("Channel Has Activity: " + channelPath);
//            var userList = channelUsers[channelPath.toLowerCase()];
//            var pos = userList.indexOf(username);
//            if (pos === -1)
//                throw new Error("User not in channel [" + channelPath + "]: " + username);
//
//            userList.splice(pos, 1);
//
//            getChatExports().renderChatActionEntry(responseString, function (html) {
//                ClientWorkerThread.render(html);
//            });
//
//            getChatExports().renderChatUserList(channelPath, userList, function (html) {
//                ClientWorkerThread.render(html);
//            });
//            return true;
//        }
//
//
//        // KEYLIST Command
//        function keyListCommand(commandString) {
//            var match = /^(?:channel\.)?keylist$/im.exec(commandString);
//            if(!match)
//                return false;
//            //var channelPath = match[1];
//
//            ClientWorkerThread.sendWithSocket(commandString);
//            return true;
//        }
//
//        // KEYLIST Response
//        function keyListResponse(responseString) {
//            var match = /^(?:channel\.)?keylist/im.exec(responseString);
//            if(!match)
//                return false;
//            //var channelPath = match[1];
//            var results = match[0].split("\n");
//            var firstLine = results.shift();
//
//            console.log("TODO: Search results", results);
//            //ClientWorker.sendWithSocket(responseString);
//            return true;
//        }



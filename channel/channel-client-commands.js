/**
 * Created by ari on 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientChannelCommands = function (ClientWorkerThread) {

        ClientWorkerThread.addCommand(autoJoinCommand);

        ClientWorkerThread.addCommand(subscribeCommand);
        ClientWorkerThread.addResponse(subscribeResponse);

        ClientWorkerThread.addCommand(chatCommand);
        ClientWorkerThread.addResponse(chatResponse);

        ClientWorkerThread.addCommand(joinCommand);
        ClientWorkerThread.addResponse(joinResponse);

        ClientWorkerThread.addCommand(leaveCommand);
        ClientWorkerThread.addResponse(leaveResponse);

        ClientWorkerThread.addCommand(keyListCommand);
        ClientWorkerThread.addResponse(keyListResponse);

        ClientWorkerThread.addCommand(nickCommand);
        ClientWorkerThread.addResponse(nickResponse);

        ClientWorkerThread.addCommand(messageCommand);
        ClientWorkerThread.addResponse(messageResponse);

        ClientWorkerThread.addResponse(userlistResponse);


        function chatCommand(commandString) {
            var match = /^(?:channel\.)?chat\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandString);
            if (!match)
                return false;

            var channelPath = match[1];
            var channelMessage = match[2];
            commandString = "CHAT " + channelPath + " " + Date.now() + " " + channelMessage;
            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }

        function chatResponse(responseString) {
            var match = /^(?:channel\.)?chat\s+(\S+)/im.exec(responseString);
            if (!match)
                return false;

            var channelPath = match[1];
            renderChatWindow(channelPath);
            console.info("Channel has Activity: " + channelPath);

            getChatExports().renderChatMessage(responseString, function (html) {
                ClientWorkerThread.render(html);
            });
            return true;
        }

        function autoJoinCommand(commandString) {
            var match = /^(?:channel\.)?autojoin/im.exec(commandString);
            if (!match)
                return false;

            console.log("TODO: finish autojoin");

            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;

            // Check Nick
            SettingsDB.getSettings("channel.nick", function(nickSettings) {
                if(nickSettings && nickSettings.username) {
//                     console.log("Auto Nick: " + nickSettings.username, nickSettings);
                    nickCommand("NICK " + nickSettings.username);
                }
            });

            // Query Auto Join Channels
            SettingsDB.getAllSettings("channel:*", function(channelSettings) {
//                 console.log("Settings: ", channelSettings);
                if(channelSettings) {
                    if(channelSettings.auto_join === 1) {
//                         console.log("Auto Joining: " + channelSettings.name_original_case, channelSettings);
                        joinCommand("SUBSCRIBE " + channelSettings.name_original_case);
                    }
                }
            });


            return true;
        }

        var channelUsers = {};

        function subscribeCommand(commandString) {
            var match = /^(?:channel\.)?(un)?subscribe\s+(\S+)\s*([\S\s]*)$/im.exec(commandString);
            if (!match)
                return false;

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }

        // KEYSPACE.SUBSCRIBE.GET ABCD1234 <-- host GET
        // KEYSPACE.SUBSCRIBE.PUT ABCD1234 <-- host PUT
        // KEYSPACE.SUBSCRIBE.STATUS ABCD1234
        // KEYSPACE.MESSAGE ABCD1234

        // todo: if keyspace subscribed and in a channel, share keyspace contact between how?

        // CHANNEL.SUBSCRIBE /state/az ABCD1234  how to connect to keyspace? or share contacts?
        // CHANNEL.SUBSCRIBE.CONTACT /state/az ABCD1234 <-- find others by public key? maybe avoid keyspace?
        // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
        // CHANNEL.SUBSCRIBE.GET /state/az ABCD1234 <-- host in channel? share contacts? how would that work? k.i.s.s.
        // CHANNEL.SUBSCRIBE.PUT /state/az ABCD1234 <-- host services in channel?
        // CHANNEL.UNSUBSCRIBE.CHAT /state/az
        // CHANNEL.MESSAGE /state/az guest123 sup bro

        // CHANNEL.SUBSCRIBE ABCD1234 /state/az CHAT guest123
        // CHANNEL.SUBSCRIBE ABCD1234 /state/az AUDIO
        // CHANNEL.SUBSCRIBE.CHAT ABCD1234 /state/az
        // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
        function subscribeResponse(responseString) {
            var match = /^(?:channel\.)?(un)?subscribe\.(\w+)\s+(\S+)\s*([\S\s]*)$/im.exec(responseString);
            if (!match)
                return false;

            var unsubscribe = match[1].toLowerCase() === 'un';
            var mode = match[2];
            var channel = match[3];
            var argString = match[4];

            // Update Channel Database
            self.module = {exports: {}};
            importScripts('channel/channel-db.js');
            var ChannelDB = self.module.exports.ChannelDB;

            // TODO: memory instead of database?
            // TODO: do we need to know status? yes. for contact list.
            if(unsubscribe) {
                ChannelDB.removeSubscription(channel, mode, function(err, subscriptionData) {
                    if(err)
                        throw new Error(err);
                });
            } else {
                ChannelDB.addSubscription(channel, mode, function(err, subscriptionData) {
                    if(err)
                        throw new Error(err);
                });
            }

            return true;
        }

        function joinCommand(commandString) {
            var match = /^(?:channel\.)?join(\.public)?\s+(\S+)/im.exec(commandString);
            if (!match)
                return false;

            var publicChannel = match[1].length > 0;
            var channelPath = match[2];

            // Update Settings
            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;
            SettingsDB.getSettings("channel:" + channelPath.toLowerCase(), function(channelSettings) {
                channelSettings.auto_join = 1;
                channelSettings.name_original_case = channelPath;
                SettingsDB.updateSettings(channelSettings);
            });

            ClientWorkerThread.sendWithSocket(commandString);

            var subscribeCommandString;
            // TODO: subscribe command


            renderChatWindow(channelPath, true);
            ClientWorkerThread.postResponseToClient("FOCUS chat:" + channelPath.toLowerCase());
            return true;
        }

        function joinResponse(responseString) {
            var match = /^(?:channel\.)?join\s+(\S+)\s+(\S+)\s+/im.exec(responseString);
            if (!match)
                return false;

            //var args = responseString.split(/\s/);
            var channelPath = match[1];
            var username = match[2];
            renderChatWindow(channelPath);

//             console.info("Joined Channel: " + channelPath);
            getChatExports().renderChatActionEntry(responseString, function (html) {
                ClientWorkerThread.render(html);
            });

            var userList = channelUsers[channelPath.toLowerCase()];
            if (!userList)
                userList = channelUsers[channelPath.toLowerCase()] = [];
            if (userList.indexOf(username) == -1) {
                userList.push(username);

                userList.sort();
                getChatExports().renderChatUserList(channelPath, userList, function (html) {
                    ClientWorkerThread.render(html);
                });
            }

            ClientWorkerThread.postResponseToClient("FOCUS chat:" + channelPath.toLowerCase());
            return true;
        }

        // LEAVE Command
        function leaveCommand(commandString) {
            var match = /^(?:channel\.)?leave\s+(\S+)/im.exec(commandString);
            if (!match)
                return false;
            var channelPath = match[1];

            // Update Settings
            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;
            SettingsDB.getSettings("channel:" + channelPath, function(channelSettings) {
                delete channelSettings.auto_join;
                // TODO: delete empty channel settings
                SettingsDB.updateSettings(channelSettings);
            });

            ClientWorkerThread.postResponseToClient("CLOSE chat:" + channelPath.toLowerCase());

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }

        function leaveResponse(responseString) {
            var match = /^(?:channel\.)?leave\s+(\S+)\s+(\S+)\s+/im.exec(responseString);
            if (!match)
                return false;
            var channelPath = match[1];
            var username = match[2];

            renderChatWindow(channelPath);

            console.info("Channel Has Activity: " + channelPath);
            var userList = channelUsers[channelPath.toLowerCase()];
            var pos = userList.indexOf(username);
            if (pos === -1)
                throw new Error("User not in channel [" + channelPath + "]: " + username);

            userList.splice(pos, 1);

            getChatExports().renderChatActionEntry(responseString, function (html) {
                ClientWorkerThread.render(html);
            });

            getChatExports().renderChatUserList(channelPath, userList, function (html) {
                ClientWorkerThread.render(html);
            });
            return true;
        }


        // KEYLIST Command
        function keyListCommand(commandString) {
            var match = /^(?:channel\.)?keylist$/im.exec(commandString);
            if(!match)
                return false;
            //var channelPath = match[1];

            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }

        // KEYLIST Response
        function keyListResponse(responseString) {
            var match = /^(?:channel\.)?keylist/im.exec(responseString);
            if(!match)
                return false;
            //var channelPath = match[1];
            var results = match[0].split("\n");
            var firstLine = results.shift();

            console.log("TODO: Search results", results);
            //ClientWorker.sendWithSocket(responseString);
            return true;
        }



        // USERLIST Response
        function userlistResponse(commandResponse) {
            var match = /^(?:channel\.)?userlist\s+(\S+)\s+([\s\S]+)$/im.exec(commandResponse);
            if (!match)
                return false;
            var channelPath = match[1];
            var userList = match[2].split(/\s+/img);
            userList = userList.filter(function (value, index, self) {
                return self.indexOf(value) === index;
            });

            renderChatWindow(channelPath);

            channelUsers[channelPath.toLowerCase()] = userList;

            getChatExports().renderChatUserList(channelPath, userList, function (html) {
                ClientWorkerThread.render(html);
            });
            return true;
        }

        // NICK Command
        function nickCommand(commandString) {
            var match = /^(?:channel\.)?nick\s+([a-z0-9_-]{2,64})$/im.exec(commandString);
            if(!match)
                return false;

            var newNick = match[1];

            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;

            // Update Settings
            SettingsDB.getSettings("channel.nick", function(nickSettings) {
                if(nickSettings.username)
                    nickSettings.old_username = nickSettings.username;
                nickSettings.username = newNick;
                SettingsDB.updateSettings(nickSettings);
            });

//             console.log("Changing Username: " + commandString);
            ClientWorkerThread.sendWithSocket(commandString);
            return true;
        }

        function nickResponse(responseString) {
            var match = /^(?:channel\.)?nick\s+(\S+)\s+(\S+)/im.exec(responseString);
            if (!match)
                return false;

            var old_username = match[1];
            var new_username = match[2];
            var found = false;
            for (var channelPathLowerCase in channelUsers) {
                if (channelUsers.hasOwnProperty(channelPathLowerCase)) {
                    (function (channelPathLowerCase) {
                        var userList = channelUsers[channelPathLowerCase];
                        var pos = userList.indexOf(old_username);
                        if (pos >= 0) {
                            userList[pos] = new_username;

                            // Render Nick Change Event
                            getChatExports().renderChatNickChange(responseString, channelPathLowerCase, function (html) {
                                ClientWorkerThread.render(html);
                            });

                            // Render New User List
                            getChatExports().renderChatUserList(channelPathLowerCase, userList, function (html) {
                                ClientWorkerThread.render(html);
                            });

                            // TODO: refresh private message

                            found = true;
                        }
                    })(channelPathLowerCase);
                }
            }
            if (found)
                return true;

            return true;
            // throw new Error("Nick not found in user list: " + old_username);
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
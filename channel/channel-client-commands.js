/**
 * Created by ari on 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientChannelCommands = function (ClientWorker) {

        ClientWorker.addCommand(autoJoinCommand);

        ClientWorker.addCommand(chatCommand);
        ClientWorker.addResponse(chatResponse);

        ClientWorker.addCommand(joinCommand);
        ClientWorker.addResponse(joinResponse);

        ClientWorker.addCommand(leaveCommand);
        ClientWorker.addResponse(leaveResponse);

        ClientWorker.addCommand(keyListCommand);
        ClientWorker.addResponse(keyListResponse);

        ClientWorker.addCommand(nickCommand);
        ClientWorker.addResponse(nickResponse);

        ClientWorker.addCommand(messageCommand);
        ClientWorker.addResponse(messageResponse);

        ClientWorker.addResponse(userlistResponse);


        function chatCommand(commandString) {
            var match = /^(?:channel\.)?chat\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandString);
            if (!match)
                return false;

            var channelPath = match[1];
            var channelMessage = match[2];
            commandString = "CHAT " + channelPath + " " + Date.now() + " " + channelMessage;
            ClientWorker.sendWithSocket(commandString);
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
                ClientWorker.appendChild('channel-log:' + channelPath.toLowerCase(), html);
            });
            return true;
        }

        function autoJoinCommand(commandString) {
            var match = /^(?:channel\.)?autojoin/im.exec(commandString);
            if (!match)
                return false;

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
                        joinCommand("JOIN " + channelSettings.name_original_case);
                    }
                }
            });


            return true;
        }

        var channelUsers = {};

        function joinCommand(commandString) {
            var match = /^(?:channel\.)?join\s+(\S+)/im.exec(commandString);
            if (!match)
                return false;

            var channelPath = match[1];

            // Update Settings
            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;
            SettingsDB.getSettings("channel:" + channelPath.toLowerCase(), function(channelSettings) {
                channelSettings.auto_join = 1;
                channelSettings.name_original_case = channelPath;
                SettingsDB.updateSettings(channelSettings);
            });

            ClientWorker.sendWithSocket(commandString);

            renderChatWindow(channelPath, true);
            ClientWorker.postResponseToClient("FOCUS chat:" + channelPath.toLowerCase());
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
                ClientWorker.appendChild('channel-log:' + channelPath.toLowerCase(), html);
            });

            var userList = channelUsers[channelPath.toLowerCase()];
            if (!userList)
                userList = channelUsers[channelPath.toLowerCase()] = [];
            if (userList.indexOf(username) == -1) {
                userList.push(username);

                userList.sort();
                getChatExports().renderChatUserList(channelPath, userList, function (html) {
                    ClientWorker.replace('channel-users:' + channelPath.toLowerCase(), html);
                });
            }

            ClientWorker.postResponseToClient("FOCUS chat:" + channelPath.toLowerCase());
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

            ClientWorker.postResponseToClient("CLOSE chat:" + channelPath.toLowerCase());

            ClientWorker.sendWithSocket(commandString);
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
                ClientWorker.appendChild('channel-log:' + channelPath.toLowerCase(), html);
            });

            getChatExports().renderChatUserList(channelPath, userList, function (html) {
                ClientWorker.replace('channel-users:' + channelPath.toLowerCase(), html);
            });
            return true;
        }


        // KEYLIST Command
        function keyListCommand(commandString) {
            var match = /^(?:channel\.)?keylist$/im.exec(commandString);
            if(!match)
                return false;
            //var channelPath = match[1];

            ClientWorker.sendWithSocket(commandString);
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
                ClientWorker.replace('channel-users:' + channelPath.toLowerCase(), html);
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
            ClientWorker.sendWithSocket(commandString);
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
                            getChatExports().renderChatNickChange(responseString, function (html) {
                                ClientWorker.appendChild('channel-log:' + channelPathLowerCase, html);
                            });

                            // Render New User List
                            getChatExports().renderChatUserList(channelPathLowerCase, userList, function (html) {
                                ClientWorker.replace('channel-users:' + channelPathLowerCase, html);
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
                ClientWorker.sendWithSocket(formattedCommandString);
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
                ClientWorker.appendChild('message-log:' + username, html);
            });
            return true;
        }

        var activeChannels = [];
        function renderChatWindow(channelPath) {
            var channelPathLowerCase = channelPath.toLowerCase();

            if (activeChannels.indexOf(channelPathLowerCase) === -1) {
                getChatExports().renderChatWindow(channelPath, function (html) {
                    ClientWorker.render(html);
                    activeChannels.push(channelPathLowerCase);
                });
            }
        }


        var activeMessages = [];
        function renderMessageWindow(username) {
            if (activeMessages.indexOf(username) === -1) {
                getMessageExports().renderMessageWindow(username, function (html) {
                    ClientWorker.render(html);
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
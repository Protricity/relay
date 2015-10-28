/**
 * Created by ari on 7/2/2015.
 */
if(typeof module === 'object') {
    module.exports.initClientChannelCommands = function (Client) {

        self.exports = {};
        self.module = {exports: {}};
        importScripts('channel/render/channel-window.js');
        var chatExports = self.module.exports;


        Client.addCommand(joinCommand);
        Client.addResponse(joinResponse);

        Client.addCommand(chatCommand);
        Client.addResponse(chatResponse);

        Client.addCommand(leaveCommand);
        Client.addResponse(leaveResponse);

        Client.addCommand(nickCommand);
        Client.addResponse(nickResponse);

        Client.addCommand(messageCommand);
        Client.addResponse(messageResponse);

        Client.addResponse(userlistResponse);


        function chatCommand(commandString) {
            var match = /^chat\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandString);
            if (!match)
                return false;

            var channelPath = match[1];
            var channelMessage = match[2];
            commandString = "CHAT " + channelPath + " " + Date.now() + " " + channelMessage;
            Client.sendWithSocket(commandString);
            return true;
        }

        function chatResponse(responseString) {
            var match = /^chat\s+(\S+)/im.exec(responseString);
            if (!match)
                return false;

            var channelPath = match[1];
            renderChatWindow(channelPath, function () {
                console.info("Channel has Activity: " + channelPath);
                chatExports.renderChatMessage(responseString, function (html) {
                    Client.appendChild('channel-log:' + channelPath.toLowerCase(), html);
                });
            });
            return true;
        }

        var channelUsers = {};

        function joinCommand(commandString) {
            var match = /^join/i.exec(commandString);
            if (!match)
                return false;
            Client.sendWithSocket(commandString);
            return true;
        }

        function joinResponse(responseString) {
            var match = /^join\s+(\S+)\s+(\S+)\s+/im.exec(responseString);
            if (!match)
                return false;

            var args = responseString.split(/\s/);
            var channelPath = match[1];
            var username = match[2];
            renderChatWindow(channelPath, function () {
                console.info("Joined Channel: " + channelPath);
                chatExports.renderChatActionEntry(responseString, function (html) {
                    Client.appendChild('channel-log:' + channelPath.toLowerCase(), html);
                });

                var userList = channelUsers[channelPath.toLowerCase()];
                if (!userList)
                    userList = channelUsers[channelPath.toLowerCase()] = [];
                if (userList.indexOf(username) == -1) {
                    userList.push(username);

                    userList.sort();
                    chatExports.renderChatUserList(channelPath, userList, function (html) {
                        Client.replace('channel-active-users:' + channelPath.toLowerCase(), html);
                    });
                }
            });
            return true;
        }

        function userlistResponse(commandResponse) {
            var match = /^userlist\s+(\S+)\s+([\s\S]+)$/im.exec(commandResponse);
            if (!match)
                return false;
            var channelPath = match[1];
            var userList = match[2].split(/\s+/img);
            userList = userList.filter(function (value, index, self) {
                return self.indexOf(value) === index;
            });

            renderChatWindow(channelPath, function () {
//             console.info("Channel has a user list: " + channelPath);
                channelUsers[channelPath.toLowerCase()] = userList;

                chatExports.renderChatUserList(channelPath, userList, function (html) {
                    Client.replace('channel-active-users:' + channelPath.toLowerCase(), html);
                });
            });
            return true;
        }

        function leaveCommand(commandString) {
            var match = /^leave/i.exec(commandString);
            if (!match)
                return false;
            Client.send(commandString);
        }

        function leaveResponse(responseString) {
            var match = /^leave\s+(\S+)\s+(\S+)\s+/im.exec(responseString);
            if (!match)
                return false;
            var channelPath = match[1];
            var username = match[2];

            renderChatWindow(channelPath, function () {
                console.info("Channel Has Activity: " + channelPath);
                var userList = channelUsers[channelPath.toLowerCase()];
                var pos = userList.indexOf(username);
                if (pos === -1)
                    throw new Error("User not in channel [" + channelPath + "]: " + username);

                userList.splice(pos, 1);

                chatExports.renderChatActionEntry(responseString, function (html) {
                    Client.appendChild('channel-log:' + channelPath.toLowerCase(), html);
                });

                chatExports.renderChatUserList(channelPath, userList, function (html) {
                    Client.replace('channel-active-users:' + channelPath.toLowerCase(), html);
                });
            });
            return true;
        }

        function nickCommand(commandString) {
            var match = /^nick/i.exec(commandString);
            if (!match)
                return false;

            Client.sendWithSocket(commandString);
            return true;
        }

        function nickResponse(responseString) {
            var match = /^nick\s+(\S+)\s+(\S+)/im.exec(responseString);
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
                            chatExports.renderChatNickChange(responseString, function (html) {
                                Client.appendChild('channel-log:' + channelPathLowerCase, html);
                            });

                            // Render New User List
                            chatExports.renderChatUserList(channelPathLowerCase, userList, function (html) {
                                Client.replace('channel-active-users:' + channelPathLowerCase, html);
                            });
                            found = true;
                        }
                    })(channelPathLowerCase);
                }
            }
            if (found)
                return true;

            throw new Error("Nick not found in user list: " + old_username);
        }


        function messageCommand(commandString) {
            var match = /^message/i.exec(commandString);
            if (!match)
                return false;
            Client.send(commandString);
        }

        function messageResponse(responseString) {
            if (!/^message/i.test(responseString))
                return false;
            //var username = match[2];
            //var content = fixPGPMessage(match[3]);
            chatExports.renderChatMessage(responseString, function (html, username) {
                Client.appendChild('message:' + username, html);
            });
            return true;
        }

        var activeChannels = [];

        function renderChatWindow(channelPath, callback) {
            var channelPathLowerCase = channelPath.toLowerCase();

            if (activeChannels.indexOf(channelPathLowerCase) === -1) {
                chatExports.renderChatWindow(channelPath, function (html) {
                    Client.render(html);
                    activeChannels.push(channelPathLowerCase);
                });
            }

            if (callback)
                callback();
        }

    };
}
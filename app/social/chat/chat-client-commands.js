/**
 * Created by ari on 7/2/2015.
 */
(function() {

    self.exports = {};
    importScripts('app/social/chat/render/chat-window.js');
    var chatExports = self.exports;

    var PATH_PREFIX_CHAT = 'chat:';
    var PATH_PREFIX_CHAT_USER_LIST = 'chat-user-list:';

    var PATH_PREFIX_MESSAGE = 'message:';

    var activeChannels = [];


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

    //
    //Client.addCommand(channelCommand);
    //function channelCommand(commandString, e) {
    //    if(!/^(message|join|leave)/i.test(commandString))
    //        return false;
    //    Client.sendWithSocket(commandString, e);
    //    return true;
    //}
//    function(commandString) {
//        var args = commandString.split(/\s+/, 3);
//        var channelPath = args[1];
////         var session_uid = match[2];
////         var username = match[3];
//
//        checkChannel(channelPath);
//        Client.sendWithSocket(commandString);
//    });


    function chatCommand(commandString) {
        var match = /^chat\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandString);
        if(!match)
            return false;

        var channelPath = match[1];
        var channelMessage = match[2];
        commandString = "CHAT " + channelPath + " " + Date.now() + " " + channelMessage;
        Client.sendWithSocket(commandString);
        return true;
    }

    function chatResponse(responseString) {
        var match = /^(chat)\s+(\S+)/im.exec(responseString);
        if(!match)
            return false; 

        var channelPath = match[2];
        renderChatWindow(channelPath, function() {
            chatExports.renderChatMessage(responseString, function(html) {
                Client.render('chat-log:' + channelPath.toLowerCase(), html);
            });
        });
        return true;
    }

    var channelUsers = {};
    function joinCommand(commandString) {
        var match = /^join/i.exec(commandString);
        if(!match)
            return false;
        Client.sendWithSocket(commandString);
        return true;
    }

    function joinResponse(responseString) {
        var match = /^(join)\s+(\S+)\s+(\S+)\s+/im.exec(responseString);
        if(!match)
            return false;

        var args = responseString.split(/\s/);
        var channelPath = match[2];
        var username = match[3];
        renderChatWindow(channelPath, function() {
            chatExports.renderChatActionEntry(responseString, function(html) {
                Client.render('chat-log:' + channelPath.toLowerCase(), html);
            });

            var userList = channelUsers[channelPath.toLowerCase()];
            if(userList.indexOf(username) == -1) {
                userList.push(username);
                userList.sort();
                chatExports.renderChatUserList(channelPath, userList, function(html) {
                    Client.render('chat-active-users:' + channelPath.toLowerCase(), html);
                });
            }
        });
        return true;
    }

    function userlistResponse(commandResponse) {
        var match = /^(userlist)\s+(\S+)\s+([\s\S]+)$/im.exec(commandResponse);
        if(!match)
            return false;
        var channelPath = match[2];
        var userList = match[3].split(/\s+/img);
        channelUsers[channelPath.toLowerCase()] = userList;

        chatExports.renderChatUserList(channelPath, userList, function(html) {
            Client.render('chat-active-users:' + channelPath.toLowerCase(), html);
        });
        return true;
    }

    function leaveCommand(commandString) {
        var match = /^leave/i.exec(commandString);
        if(!match)
            return false;
        Client.send(commandString);
    }

    function leaveResponse(responseString) {
        var match = /^(leave)\s+(\S+)\s+(\S+)\s+/im.exec(responseString);
        if(!match)
            return false;
        var channelPath = match[2];
        var username = match[3];

        renderChatWindow(channelPath, function () {
            var userList = channelUsers[channelPath.toLowerCase()];
            var pos = userList.indexOf(username);
            if(pos === -1)
                throw new Error("User not in channel [" + channelPath + "]: " + username);

            userList.splice(pos, 1);

            chatExports.renderChatActionEntry(responseString, function(html) {
                Client.render('chat-log:' + channelPath.toLowerCase(), html);
            });

            chatExports.renderChatUserList(channelPath, userList, function(html) {
                Client.render('chat-active-users:' + channelPath.toLowerCase(), html);
            });
        });
        return true;
    }

    function nickCommand(commandString) {
        var match = /^nick/i.exec(commandString);
        if(!match)
            return false;

        Client.sendWithSocket(commandString);
        return true;
    }

    function nickResponse(responseString) {
        var match = /^(nick)\s+(\S+)\s+(\S+)/im.exec(responseString);
        if(!match)
            return false;

        var old_username = match[2];
        var new_username = match[3];
        for (var channelPath in channelUsers) {
            if (channelUsers.hasOwnProperty(channelPath)) {
                (function (channelPath) {
                    var userList = channelUsers[channelPath];
                    var pos = userList.indexOf(old_username);
                    if (pos >= 0) {
                        userList[pos] = new_username;
                        chatExports.renderChatNickChange(responseString, function (html) {
                            Client.render('chat-log:' + channelPath.toLowerCase(), html);
                        });
                        chatExports.renderChatUserList(channelPath, userList, function(html) {
                            Client.render('chat-active-users:' + channelPath.toLowerCase(), html);
                        });
                    }
                })(channelPath);
            }
        }
        return true;
    }


    function messageCommand(commandString) {
        var match = /^message/i.exec(commandString);
        if(!match)
            return false;
        Client.send(commandString);
    }

    function messageResponse(responseString) {
        if(!/^message/i.test(responseString))
            return false;
        //var username = match[2];
        //var content = fixPGPMessage(match[3]);
        chatExports.renderChatMessage(responseString, function(html, username) {
            Client.render('message:' + username, html);
        });
        return true;
    }

    function renderChatWindow(channelPath, callback) {
        var channelPathLowerCase = channelPath.toLowerCase();
        if(typeof channelUsers[channelPathLowerCase] === 'undefined') {
            channelUsers[channelPathLowerCase] = [];
            chatExports.renderChatWindow(channelPath, function(html) {
                Client.render("chat:" + channelPathLowerCase, html);
                console.info("New active channel: " + channelPath);
                if(callback)
                    callback();
            });

        } else {
            if(callback)
                callback();
        }
    }


//
//
//    function fixPGPMessage(htmlContent) {
//        if(htmlContent.indexOf("<div class='pgp-message'>") >= 0)
//            return htmlContent;
//
//        var reg, match, encodedContent;
//
//        reg = /-----BEGIN PGP MESSAGE-----[\s\S]+-----END PGP MESSAGE-----/img;
//        while(match = reg.exec(htmlContent)) {
//
////             encodedContent = match[0].trim().replace(/./gim, function(i) {
////                 return '&#'+i.charCodeAt(0)+';';
////             });
//            encodedContent = encodeURIComponent(match[0].trim());
//            htmlContent = htmlContent.replace(match[0], "<div class='pgp-message decryption-required' >" +
//                encodedContent +
//            "</div>");
//        }
//
//        reg = /-----BEGIN PGP SIGNED MESSAGE-----[\s\S]+-----BEGIN PGP SIGNATURE-----[\s\S]+-----END PGP SIGNATURE-----/img;
//        while(match = reg.exec(htmlContent)) {
////             encodedContent = match[0].trim().replace(/./gim, function(i) {
////                 return '&#'+i.charCodeAt(0)+';';
////             });
//
//            encodedContent = encodeURIComponent(match[0].trim());
//            htmlContent = htmlContent.replace(match[0],
//                "<div class='pgp-signed-message verification-required'>" +
//                    encodedContent +
//                "</div>");
//        }
//
//
//        return htmlContent;
//    }

})();



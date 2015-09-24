/**
 * Created by ari on 7/2/2015.
 */
(function() {

    importScripts('chat/chat-templates.js');

    var PATH_PREFIX_CHAT = 'chat:';
    var PATH_PREFIX_CHAT_USER_LIST = 'chat-user-list:';

    var PATH_PREFIX_MESSAGE = 'message:';

    var activeChannels = [];

    Client.addCommand('message', Client.sendWithSocket);
    Client.addCommand('join', Client.sendWithSocket);
    Client.addCommand('leave', Client.sendWithSocket);
//    function(commandString) {
//        var args = commandString.split(/\s+/, 3);
//        var channelPath = args[1];
////         var session_uid = match[2];
////         var username = match[3];
//
//        checkChannel(channelPath);
//        Client.sendWithSocket(commandString);
//    });


    Client.addCommand('chat', function(commandString) {
        var match = /^chat\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandString);
        if(!match)
            throw new Error("Invalid Chat Command: " + commandString);
        var channelPath = match[1];
        var channelMessage = match[2];
        commandString = "CHAT " + channelPath + " " + Date.now() + " " + channelMessage;
        return Client.sendWithSocket(commandString);
    });

    Client.addResponse('chat', function(commandResponse, e) {
        var match = /^(chat)\s+(\S+)/im.exec(commandResponse);
        if(!match)
            throw new Error("Invalid Chat Response: " + commandResponse);
        var channelPath = match[2];
        getChannelUsers(channelPath);
        Templates.chat.message(commandResponse, function(html) {
            Client.postResponseToClient('LOG chat-log:' + channelPath.toLowerCase() + ' ' + html);
        });
    });

    var channelUsers = {};
    Client.addResponse('join', function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var channelPath = args[1];
        var channelPathLowerCase = channelPath.toLowerCase();
        var username = args[2];
        getChannelUsers(channelPath);
        Templates.chat.action(commandResponse, function(html) {
            Client.postResponseToClient('LOG chat-log:' + channelPathLowerCase + ' ' + html);
        });

        var userList = getChannelUsers(channelPath);
        if(userList.indexOf(username) == -1) {
            userList.push(username);
            userList.sort();
            Templates.chat.userList(channelPath, userList, function(html) {
                Client.postResponseToClient('LOG.REPLACE chat-active-users:' + channelPath.toLowerCase() + ' ' + html);
            });
        }

    });

    Client.addResponse('userlist', function(commandResponse) {
        var match = /^(userlist)\s+(\S+)\s+([\s\S]+)$/im.exec(commandResponse);
        var channelPath = match[2];
        var channelPathLowerCase = channelPath.toLowerCase();
        var userList = match[3].split(/\s+/img);
        channelUsers[channelPathLowerCase] = userList;

        Templates.chat.userList(channelPath, userList, function(html) {
            Client.postResponseToClient('LOG.REPLACE chat-active-users:' + channelPath.toLowerCase() + ' ' + html);
        });
    });

    Client.addResponse('leave', function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var channelPath = args[1];
        var channelPathLowerCase = channelPath.toLowerCase();
        var username = args[2];
        getChannelUsers(channelPath);
        Templates.chat.action(commandResponse, function(html) {
            Client.postResponseToClient('LOG chat-log:' + channelPathLowerCase + ' ' + html);
        });

        var userList = getChannelUsers(channelPath);
        var pos = userList.indexOf(username);
        if(pos === -1)
            throw new Error("User not in channel [" + channelPath + "]: " + username);

        userList.splice(pos, 1);

        Templates.chat.userList(channelPath, userList, function(html) {
            Client.postResponseToClient('LOG.REPLACE chat-active-users:' + channelPath.toLowerCase() + ' ' + html);
        });
    });

    Client.addResponse('nick', function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var old_username = args[1];
        var new_username = args[2];
        console.log(old_username, new_username);
        for (var channelPath in channelUsers) {
            if (channelUsers.hasOwnProperty(channelPath)) {
                (function (channelPath) {
                    var userList = channelUsers[channelPath];
                    var pos = userList.indexOf(old_username);
                    if (pos >= 0) {
                        userList[pos] = new_username;
                        Templates.chat.nick(commandResponse, function (html) {
                            Client.postResponseToClient('LOG chat-log:' + channelPath.toLowerCase() + ' ' + html);
                        });
                        Templates.chat.userList(channelPath, userList, function(html) {
                            Client.postResponseToClient('LOG.REPLACE chat-active-users:' + channelPath.toLowerCase() + ' ' + html);
                        });
                    }
                })(channelPath);
            }
        }
    });

    Client.addResponse('message', function(commandResponse) {
        var match = /^(msg|message)\s+([\s\S]+)$/im.exec(commandResponse);
        var username = match[2];
        //var content = fixPGPMessage(match[3]);
        Templates.chat.message(commandResponse, function(html) {
            Client.postResponseToClient('LOG message:' + username + ' ' + html);
        });
    });

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

    function getChannelUsers(channelPath) {
        if(!channelPath)
            throw new Error("Invalid Channel Path Argument");

        var channelPathLowerCase = channelPath.toLowerCase();
        if(typeof channelUsers[channelPathLowerCase] === 'undefined') {
            channelUsers[channelPathLowerCase] = [];
            Templates.chat.form(channelPath, function(html) {
                Client.postResponseToClient("LOG.REPLACE chat:" + channelPathLowerCase + ' ' + html);
            });
            console.info("New active channel: " + channelPath);
        }
        return channelUsers[channelPathLowerCase];
    }

})();



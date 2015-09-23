/**
 * Created by ari on 7/2/2015.
 */
(function() {

    importScripts('chat/chat-templates.js');

    var PATH_PREFIX_CHAT = 'chat:';
    var PATH_PREFIX_CHAT_USER_LIST = 'chat-user-list:';

    var PATH_PREFIX_MESSAGE = 'message:';

    var activeChannels = [];

    Client.addCommand(['message', 'join', 'leave'],
    function(commandString) {
        var args = commandString.split(/\s+/, 3);
        var channelPath = args[1];
//         var session_uid = match[2];
//         var username = match[3];

        checkChannel(channelPath);
        Client.sendWithSocket(commandString);
    });


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
        var match = /^(chat)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*([\s\S]+)$/im.exec(commandResponse);
        if(!match)
            throw new Error("Invalid Chat Response: " + commandResponse);
        var channelPath = match[2];
        checkChannel(channelPath);
        Templates.chat.message(commandResponse, function(html) {
            Client.postResponseToClient('LOG chat-log:' + channelPath.toLowerCase() + ' ' + html);
        });
    });

    var sigIDLists = {};
    Client.addResponse('join', function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var channelPath = args[1];
        var pgp_id_public = args[2];
        var session_uid = args[3];
        var username = args[4];
        var visibility = args[5];
        checkChannel(channelPath);
        Templates.chat.action(commandResponse, function(html) {
            Client.postResponseToClient('LOG chat-log:' + channelPath.toLowerCase() + ' ' + html);
        });

        var sigIDList = sigIDLists[channelPath.toLowerCase()] || [];
        var identityString = "IDSIG" + // Recreate IDSIG cause we can
            " " + pgp_id_public +
            " " + session_uid +
            " " + username +
            " " + visibility;

        if(!sigIDList.indexOf(identityString)) {
            //throw new Error("Duplicate SIGID in user list: " + identityString);

            sigIDList.push(identityString);

            sigIDList.sort(function (s1, s2) {
                return s1.split(/\s+/g)[3] - s2.split(/\s+/g)[3];
            });
            sigIDLists[channelPath.toLowerCase()] = sigIDList;
        }
        sendUserList(channelPath, sigIDList);

    });

    Client.addResponse('userlist', function(commandResponse) {
        var match = /^(userlist)\s+([^\s]+)\n([\s\S]+)$/im.exec(commandResponse);
        var channelPath = match[2];
        var sigIDList = match[3].split(/\n/img);
        sigIDLists[channelPath.toLowerCase()] = sigIDList;

        sendUserList(channelPath, sigIDList);
    });

    Client.addResponse('leave', function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var channelPath = args[1];
        var pgp_id_public = args[2];
        var session_uid = args[3];
        var username = args[4];
        checkChannel(channelPath);
        Templates.chat.action(commandResponse, function(html) {
            Client.postResponseToClient('LOG chat-log:' + channelPath.toLowerCase() + ' ' + html);
        });

        var sigIDList = sigIDLists[channelPath.toLowerCase()] || [];
        var sigIDMatch = "SIGID " + pgp_id_public + " " + session_uid;
        for(var i=0; i<sigIDList.length; i++) {
            var sigID = sigIDList[i];
            if(sigID.indexOf(sigIDMatch) === 0) {
                sigIDList.splice(i, 1);
                break;
            }
        }

        sigIDLists[channelPath.toLowerCase()] = sigIDList;

        sendUserList(channelPath, sigIDList);
    });

    Client.addResponse('nick', function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var channelPath = args[1];
        var old_username = args[2];
        var pgp_id_public = args[3];
        var session_uid = args[4];
        var new_username = args[5];
        var visibility = args[6];
        checkChannel(channelPath);
        Templates.chat.nick(commandResponse, function(html) {
            Client.postResponseToClient('LOG chat-log:' + channelPath.toLowerCase() + ' ' + html);
        });

        var sigIDList = sigIDLists[channelPath.toLowerCase()] || [];
        //var sigIDMatch = "SIGID " + pgp_id_public + " " + session_uid;
        for(var i=0; i<sigIDList.length; i++) {
            var sigID = sigIDList[i];
            if(sigID.indexOf(session_uid) !== -1) {
                sigIDList.splice(i, 1);
                break;
            }
        }

        var identityString = "IDSIG" + // Recreate IDSIG cause we can
            " " + pgp_id_public +
            " " + session_uid +
            " " + new_username +
            " " + visibility;
        sigIDList.push(identityString);

        sigIDList.sort(function (s1, s2) {
            return s1.split(/\s+/g)[3] - s2.split(/\s+/g)[3];
        });

        sigIDLists[channelPath.toLowerCase()] = sigIDList;

        sendUserList(channelPath, sigIDList);
    });

    Client.addResponse('message', function(commandResponse) {
        var match = /^(msg|message)\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandResponse);
        var session_uid = match[2];
        //var content = fixPGPMessage(match[3]);
        Templates.chat.message(commandResponse, function(html) {
            Client.postResponseToClient('LOG message:' + session_uid + ' ' + html);
        });
    });


    function sendUserList(channelPath, sigIDList) {
        Templates.chat.userList(channelPath, sigIDList, function(html) {
            Client.postResponseToClient('LOG.REPLACE chat-active-users:' + channelPath.toLowerCase() + ' ' + html);
        });

        //checkChannel(channelPath);
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

    function checkChannel(channelPath) {
        if(!channelPath)
            throw new Error("Invalid Channel Path Argument");
        if(activeChannels.indexOf(channelPath.toLowerCase()) === -1) {
            Templates.chat.form(channelPath, function(html) {
                Client.postResponseToClient("LOG.REPLACE chat:" + channelPath.toLowerCase() + ' ' + html);
            });
            activeChannels.push(channelPath.toLowerCase());
            console.info("New active channel: " + channelPath);
        }
    }

})();



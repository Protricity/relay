/**
 * Created by ari on 7/2/2015.
 */
(function() {

    importScripts('chat/chat-templates.js');

    var PATH_PREFIX_CHAT = 'chat:';
    var PATH_PREFIX_MESSAGE = 'message:';

    var activeChannels = [];

    socketCommands.message =
    socketCommands.join =
    socketCommands.leave = function(commandString) {
        var args = commandString.split(/\s+/, 3);
        var channelPath = fixChannelPath(args[1]);
//         var session_uid = match[2];
//         var username = match[3];

        checkChannel(channelPath);
        self.sendWithFastestSocket(commandString, channelPath);
    };


    socketCommands.chat = function(commandString) {
        var match = /^chat\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandString);
        if(!match)
            throw new Error("Invalid Chat Command: " + commandString);
        var channelPath = fixChannelPath(match[1]);
        var channelMessage = match[2];
        commandString = "CHAT " + channelPath + " " + Date.now() + " " + channelMessage;
        return self.sendWithFastestSocket(commandString);
    };

    socketResponses.chat = function(commandResponse, e) {
        var match = /^(chat)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandResponse);
        if(!match)
            throw new Error("Invalid Chat Response: " + commandResponse);
        var channelPath = fixChannelPath(match[2]);
        checkChannel(channelPath);
        templateChatChannelMessage(commandResponse, function(html) {
            self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .channel-content ' + html);
        });
    };

    function sendUserList(channelPath, sigIDList) {
        var optionHTML = '';
        for(var ui=0; ui<sigIDList.length; ui++) (function(sigid) {

            var split = sigid.split(/\s+/g);
            if(split[0].toUpperCase() !== 'IDSIG')
                throw new Error("Invalid IDSIG: " + sigid);

            var pgp_id_public = split[1];
            var session_uid = split[2];
            var username = split[3];
            var visibility = split[4];

            optionHTML += CHANNEL_USERLIST_SELECT_OPTION
                .replace(/{\$channel}/gi, channelPath)
                .replace(/{\$session_uid}/gi, session_uid)
                .replace(/{\$username}/gi, username)
                .replace(/{\$pgp_id_public}/gi, pgp_id_public)
                .replace(/{\$visibility}/gi, visibility);

        })(sigIDList[ui]);
        checkChannel(channelPath);
        optionHTML =
            "<optgroup class='active-users' label='Active Users (" + sigIDList.length + ")'>" +
                optionHTML +
            "</optgroup>";
        self.routeResponseToClient('LOG.REPLACE ' + PATH_PREFIX_CHAT + channelPath + ' .' + CLASS_ACTIVE_USERS + ' ' + optionHTML);

//         console.log([channelPath, sigIDList, optionHTML]);
    }

    var sigIDLists = {};
    socketResponses.userlist = function(commandResponse) {
        var match = /^(userlist)\s+([^\s]+)\n([\s\S]+)$/im.exec(commandResponse);
        var channelPath = fixChannelPath(match[2]);
        var sigIDList = match[3].split(/\n/img);
        sigIDLists[channelPath] = sigIDList;

        sendUserList(channelPath, sigIDList);
    };

    socketResponses.join = function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var channelPath = fixChannelPath(args[1]);
        var pgp_id_public = args[2];
        var session_uid = args[3];
        var username = args[4];
        var visibility = args[5];
        checkChannel(channelPath);
        templateChatChannelAction(commandResponse, function(html) {
            self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .channel-content ' + html);
        });

        var sigIDList = sigIDLists[channelPath] || [];
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
            sigIDLists[channelPath] = sigIDList;
        }
        sendUserList(channelPath, sigIDList);

    };

    socketResponses.leave = function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var channelPath = fixChannelPath(args[1]);
        var pgp_id_public = args[2];
        var session_uid = args[3];
        var username = args[4];
        checkChannel(channelPath);
        templateChatChannelAction(commandResponse, function(html) {
            self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .channel-content ' + html);
        });

        var sigIDList = sigIDLists[channelPath] || [];
        var sigIDMatch = "SIGID " + pgp_id_public + " " + session_uid;
        for(var i=0; i<sigIDList.length; i++) {
            var sigID = sigIDList[i];
            if(sigID.indexOf(sigIDMatch) === 0) {
                sigIDList.splice(i, 1);
                break;
            }
        }

        sigIDLists[channelPath] = sigIDList;

        sendUserList(channelPath, sigIDList);
    };

    socketResponses.nick = function(commandResponse) {
        var args = commandResponse.split(/\s/);
        var channelPath = fixChannelPath(args[1]);
        var old_username = args[2];
        var pgp_id_public = args[3];
        var session_uid = args[4];
        var new_username = args[5];
        var visibility = args[6];
        checkChannel(channelPath);
        templateChatChannelNick(commandResponse, function(html) {
            self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .class-content ' + html);
        });

        var sigIDList = sigIDLists[channelPath] || [];
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

        sigIDLists[channelPath] = sigIDList;

        sendUserList(channelPath, sigIDList);
    };

    socketResponses.message = function(commandResponse) {
        var match = /^(msg|message)\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandResponse);
        var session_uid = match[2];
        var content = fixPGPMessage(match[3]);
        templateChatChannelMessage(commandResponse, function(html) {
            self.routeResponseToClient('LOG ' + PATH_PREFIX_MESSAGE + session_uid + ' ' + html);
        });
    };


    function fixPGPMessage(htmlContent) {
        if(htmlContent.indexOf("<div class='pgp-message'>") >= 0)
            return htmlContent;

        var reg, match, encodedContent;

        reg = /-----BEGIN PGP MESSAGE-----[\s\S]+-----END PGP MESSAGE-----/img;
        while(match = reg.exec(htmlContent)) {

//             encodedContent = match[0].trim().replace(/./gim, function(i) {
//                 return '&#'+i.charCodeAt(0)+';';
//             });
            encodedContent = encodeURIComponent(match[0].trim());
            htmlContent = htmlContent.replace(match[0], "<div class='pgp-message decryption-required' >" +
                encodedContent +
            "</div>");
        }

        reg = /-----BEGIN PGP SIGNED MESSAGE-----[\s\S]+-----BEGIN PGP SIGNATURE-----[\s\S]+-----END PGP SIGNATURE-----/img;
        while(match = reg.exec(htmlContent)) {
//             encodedContent = match[0].trim().replace(/./gim, function(i) {
//                 return '&#'+i.charCodeAt(0)+';';
//             });

            encodedContent = encodeURIComponent(match[0].trim());
            htmlContent = htmlContent.replace(match[0],
                "<div class='pgp-signed-message verification-required'>" +
                    encodedContent +
                "</div>");
        }


        return htmlContent;
    }

    function checkChannel(channelPath) {
        //if(!/[\w_/!@#$%^&*-]+/.test(channelPath))
        //    throw new Error("Invalid Channel: " + channelPath);

        if(activeChannels.indexOf(channelPath) === -1) {
            templateChatChannel(channelPath, function(html) {
                self.routeResponseToClient("LOG.REPLACE " + PATH_PREFIX_CHAT + channelPath + ' * ' + html);
            });
            activeChannels.push(channelPath);
            console.info("New active channel: " + channelPath);
        }
    }

    function fixChannelPath(path) {
        //if(!/#?[~:./a-z_-]+/i.test(path))
        //    throw new Error("Invalid Path: " + path);
        return path.toLowerCase();
    }

})();



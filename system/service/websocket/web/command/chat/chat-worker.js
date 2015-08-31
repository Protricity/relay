/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX_CHAT = 'chat:';
    var PATH_PREFIX_MESSAGE = 'message:';

    var CLASS_ACTIVE_USERS = 'active-users';
    var CLASS_INACTIVE_USERS = 'inactive-users';
    var CLASS_CHANNEL_CONTENT = 'channel-content';

    var CHANNEL_TEMPLATE =
        "<article class='{$attr_class}'>" +
            "<script src='command/chat/chat-form.js'></script>" +
            "<link rel='stylesheet' href='command/chat/chat.css' type='text/css'>" +
            "<header><span class='command'>Join</span> {$channel}</header>" +
            "{$html_header_commands}" +
            "<form name='chat-form' action='#' onsubmit='return submitChatForm(event);'>" +
                "<table>" +
                    "<tbody>" +
                        "<tr>" +
                            "<td style='vertical-align: top'>" +
                                "<select multiple='multiple' name='user-list' size='5'>" +
                                    "<optgroup class='" + CLASS_ACTIVE_USERS + "' label='Active Users (0)'></optgroup>" +
                                    "<optgroup class='" + CLASS_INACTIVE_USERS + "' label='Inactive Users (0)'></optgroup>" +
                                "</select>" +
                            "</td>" +
                            "<td style='vertical-align: top'>" +
                                "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
                            "</td>" +
                        "</tr>" +
                        "<tr>" +
                            "<td colspan='2'>" +
                                "<input name='message' type='text' class='reset focus' placeholder='Send a message to {$channel}. [hit enter]' />" +
                                "<input type='submit' value='Send' name='submit-send-chat' />" +
                                "<input type='hidden' value='{$channel}' name='channel' />" +
                            "</td>" +
                        "</tr>" +
                    "</tbody>" +
                "</table>" +

            "</form>" +
        "</article>";

    var CHAT_TEMPLATE = '<div class="channel-log">' +
        '<span class="username" data-session-uid="{$session_uid}">{$username}</span>' +
        ': <span class="message">{$content}</span>' +
        '</div>';

    var ACTION_TEMPLATE = '<div class="channel-log">' +
        '<span class="username" data-session-uid="{$session_uid}">{$username}</span>' +
        ' has <span class="action">{$action}</span>' +
        ' <a href="#JOIN {$channel}" class="path">{$channel}</a>' +
        '</div>';

    var NICK_TEMPLATE = '<div class="channel-log">' +
        'Username <span class="username">{$old_username}</span>' +
        ' has been <span class="action">renamed</span> to <span class="username">{$new_username}</span>' +
        '</div>';


    var CHANNEL_USERLIST_SELECT_OPTION = "<option value='{$session_uid}'>{$username}</option>";

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


    socketCommands.chat = function(commandString) { return self.sendWithFastestSocket(commandString); };

    socketResponses.chat = function(commandResponse, e) {
        var match = /^(chat)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandResponse);
        if(!match)
            throw new Error("Invalid Chat Response: " + commandResponse);
        var channelPath = fixChannelPath(match[2]);
        var session_uid = match[3];
        var username = match[4];
        var content = fixPGPMessage(match[5]);
        checkChannel(channelPath);
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .' + CLASS_CHANNEL_CONTENT + ' ' + CHAT_TEMPLATE
                .replace(/{\$channel}/gi, channelPath)
                .replace(/{\$session_uid}/gi, session_uid)
                .replace(/{\$username}/gi, username)
                .replace(/{\$content}/gi, content)
        );
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
            "<optgroup class='" + CLASS_ACTIVE_USERS + "' label='Active Users (" + sigIDList.length + ")'>" +
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
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .' + CLASS_CHANNEL_CONTENT +  ' ' + ACTION_TEMPLATE
            .replace(/{\$action}/gi, 'joined')
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$session_uid}/gi, session_uid)
            .replace(/{\$username}/gi, username)
            .replace(/{\$pgp_id_public}/gi, pgp_id_public)
        );

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
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .' + CLASS_CHANNEL_CONTENT +  ' ' + ACTION_TEMPLATE
                .replace(/{\$action}/gi, 'left')
                .replace(/{\$channel}/gi, channelPath)
                .replace(/{\$session_uid}/gi, session_uid)
                .replace(/{\$username}/gi, username)
                .replace(/{\$pgp_id_public}/gi, pgp_id_public)
        );

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
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .' + CLASS_CHANNEL_CONTENT +  ' ' + NICK_TEMPLATE
                .replace(/{\$action}/gi, 'left')
                .replace(/{\$channel}/gi, channelPath)
                //.replace(/{\$old_session_uid}/gi, session_uid)
                .replace(/{\$old_username}/gi, old_username)
                //.replace(/{\$new_session_uid}/gi, session_uid)
                .replace(/{\$new_username}/gi, new_username)
        );

        var sigIDList = sigIDLists[channelPath] || [];
        var sigIDMatch = "SIGID " + pgp_id_public + " " + session_uid;
        for(var i=0; i<sigIDList.length; i++) {
            var sigID = sigIDList[i];
            if(sigID.indexOf(sigIDMatch) === 0) {
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
        self.routeResponseToClient('LOG ' + PATH_PREFIX_MESSAGE + session_uid + ' ' + MESSAGE_TEMPLATE
                .replace(/{\$session_uid}/gi, session_uid)
                .replace(/{\$content}/gi, content)
        );
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
            self.routeResponseToClient("LOG.REPLACE " + PATH_PREFIX_CHAT + channelPath + ' * ' + CHANNEL_TEMPLATE
                .replace(/{\$channel}/gi, channelPath));
            activeChannels.push(channelPath);
            console.info("New active channel: " + channelPath);
        }
    }

    function fixChannelPath(path) {
        //if(!/#?[~:./a-z_-]+/i.test(path))
        //    throw new Error("Invalid Path: " + path);
        return path.toLowerCase();
    }

    console.log("Loaded Command: join");
})();



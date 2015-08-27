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
        "<script src='cmd/chat/chat-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/chat/chat.css' type='text/css'>" +
        "<legend>Channel: {$channel}</legend>" +
        "<form name='chat-form' action='#' onsubmit='return submitChatForm(event);'>" +
            "<select multiple='multiple' name='user-list' style='float: left'>" +
                "<optgroup class='" + CLASS_ACTIVE_USERS + "' label='Active Users (0)'></optgroup>" +
                "<optgroup class='" + CLASS_INACTIVE_USERS + "' label='Inactive Users (0)'></optgroup>" +
            "</select>" +
            "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
            "<input name='message' type='text' class='reset focus' placeholder='Send a message to {$channel}. [hit enter]' />" +
            "<input type='submit' value='Send' name='submit-send-chat' />" +
            "<input type='hidden' value='{$channel}' name='channel' />" +
        "</form>";

    var CHAT_TEMPLATE = '<div class="channel-log">' +
        '<span class="username" data-session-uid="{$session_uid}">{$username}</span>' +
        ': <span class="message">{$content}</span>' +
        '</div>';

    var ACTION_TEMPLATE = '<div class="channel-log">' +
        '<span class="username" data-session-uid="{$session_uid}">{$username}</span>' +
        ' has <span class="action">{$action}</span>' +
        ' <a href="#JOIN {$channel}" class="path">{$channel}</a>' +
        '</div>';


    var CHANNEL_USERLIST_SELECT_OPTION = "<option value='{$session_uid}'>{$username}</option>";

    var activeChannels = [];

    self.messageCommand =
    self.joinCommand =
    self.leaveCommand = function(commandString) {
        var args = commandString.split(/\s+/, 3);
        var channelPath = fixChannelPath(args[1]);
//         var session_uid = match[2];
//         var username = match[3];

        checkChannel(channelPath);
        self.sendWithFastestSocket(commandString, channelPath);
    };


    self.chatCommand = self.sendWithFastestSocket;

    self.chatResponse = function(commandResponse) {
        var match = /^(chat)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandResponse);
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

    self.userlistResponse = function(commandResponse) {
        var match = /^(userlist)\s+([^\s]+)\n([\s\S]+)$/im.exec(commandResponse);
        var channelPath = fixChannelPath(match[2]);
        var userList = match[3].split(/\n/img);

        var optionHTML = '';
        for(var ui=0; ui<userList.length; ui++) (function(sigid) {

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

        })(userList[ui]);
        checkChannel(channelPath);
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .' + CLASS_ACTIVE_USERS + ' ' + optionHTML);


        console.log([channelPath, userList, optionHTML]);
    };

    self.joinResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/, 4);
        var channelPath = fixChannelPath(args[1]);
        var session_uid = args[2];
        var username = args[3];
        checkChannel(channelPath);
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .' + CLASS_CHANNEL_CONTENT +  ' ' + ACTION_TEMPLATE
            .replace(/{\$action}/gi, 'joined')
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$session_uid}/gi, session_uid)
            .replace(/{\$username}/gi, username)
        );
    };

    self.leaveResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/, 4);
        var channelPath = fixChannelPath(args[1]);
        var session_uid = args[2];
        var username = args[3];
        checkChannel(channelPath);
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' .' + CLASS_CHANNEL_CONTENT +  ' ' + ACTION_TEMPLATE
            .replace(/{\$action}/gi, 'left')
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$session_uid}/gi, session_uid)
            .replace(/{\$username}/gi, username)
        );
    };

    self.messageResponse = function(commandResponse) {
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
        return path;
    }

    console.log("Loaded Command: join");
})();



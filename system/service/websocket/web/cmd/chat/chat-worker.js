/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX_CHAT = 'chat:';
    var PATH_PREFIX_MESSAGE = 'message:';

    var CLASS_CHANNEL_CONTENT = 'channel-content';

    var CHANNEL_TEMPLATE =
        "<script src='cmd/chat/chat-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/chat/chat.css' type='text/css'>" +
        "<legend>Channel: {$channel}</legend>" +
        "<form name='chat-form' action='#' onsubmit='return submitChatForm(event);'>" +
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
        "<input name='message' type='text' class='reset focus' placeholder='Send a message to {$channel}. [hit enter]' />" +
        "<input type='submit' value='Send' name='submit-send-chat' />" +
        "<input type='hidden' value='{$channel}' name='channel' />" +
        "</form>";

    var CHAT_TEMPLATE = '<div class="channel-log">' +
        '<span class="unidentified-session-uid">{$session_uid}</span>: ' +
        '<span class="message">{$content}</span>' +
        '</div>';

    var ACTION_TEMPLATE = '<div class="channel-log">' +
        '<span class="unidentified-session-uid">{$session_uid}</span>' +
        ' has <span class="action">{$action}</span>' +
        ' <a href="#JOIN {$channel}" class="path">{$channel}</a>' +
        '</div>';

    var activeChannels = [];

    self.messageCommand =
    self.joinCommand =
    self.leaveCommand = function(commandString) {
        var args = commandString.split(/\s+/, 2);
        var channelPath = fixChannelPath(args[1]);
        checkChannel(channelPath);
        self.sendWithFastestSocket(commandString, channelPath);
    };


    self.chatCommand = self.sendWithFastestSocket;

    self.chatResponse = function(commandResponse) {
        var match = /^(chat)\s+([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandResponse);
        var channelPath = fixChannelPath(match[2]);
        var session_uid = match[3];
        var content = fixPGPMessage(match[4]);
        checkChannel(channelPath);
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' ' + CHAT_TEMPLATE
                .replace(/{\$channel}/gi, channelPath)
                .replace(/{\$session_uid}/gi, session_uid)
                .replace(/{\$content}/gi, content)
        );
    };

    self.userlistResponse = function(commandResponse) {
        var match = /^(userlist)\s+([^\s]+)\n([\s\S]+)$/im.exec(commandResponse);
        var channelPath = fixChannelPath(match[2]);
        var userList = match[3];
        //checkChannel(channelPath);
        //self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath + ' ' + CHAT_TEMPLATE
        //        .replace(/{\$channel}/gi, channelPath)
        //        .replace(/{\$session_uid}/gi, session_uid)
        //        .replace(/{\$content}/gi, content)
        //);
        console.log([channelPath, userList]);
    };

    self.joinResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/, 3);
        var channelPath = fixChannelPath(args[1]);
        var session_uid = args[2];
        checkChannel(channelPath);
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath +  ' ' + ACTION_TEMPLATE
            .replace(/{\$action}/gi, 'joined')
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$session_uid}/gi, session_uid)
        );
    };

    self.leaveResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/, 2);
        var channelPath = fixChannelPath(args[1]);
        var session_uid = args[2];
        checkChannel(channelPath);
        self.routeResponseToClient('LOG ' + PATH_PREFIX_CHAT + channelPath +  ' ' + ACTION_TEMPLATE
            .replace(/{\$action}/gi, 'left')
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$session_uid}/gi, session_uid)
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
        if(!/[\w_/!@#$%^&*-]+/.test(channelPath))
            throw new Error("Invalid Channel: " + channelPath);
        
        if(activeChannels.indexOf(channelPath) === -1) {
            routeResponseToClient("LOG " + PATH_PREFIX_CHAT + channelPath + ' ' + CHANNEL_TEMPLATE
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



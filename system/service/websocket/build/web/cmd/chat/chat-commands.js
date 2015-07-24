/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'chat:';

    var CLASS_CHANNEL_CONTENT = 'channel-content';

    var CHANNEL_TEMPLATE =
        "<script src='cmd/chat/chat-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/chat/chat.css' type='text/css'>" +
        "<legend>Channel: {$channel}</legend>" +
        "<form name='chat-form' action='#' onsubmit='return submitChatForm(event);'>" +
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
        "<input name='message' type='text' class='reset focus' placeholder='Send a message to {$channel}. [hit enter]' />" +
        "<input type='submit' value='Send' />" +
        "<input type='hidden' value='{$channel}' name='channel' />" +
        "</form>";

    var MESSAGE_TEMPLATE = '<div class="channel-log">' +
        '<span class="user">{$user}</span>: ' +
        '<span class="message">{$content}</span>' +
        '</div>';

    var ACTION_TEMPLATE = '<div class="channel-log">' +
        '<span class="user">{$user}</span>' +
        ' has <span class="action">{$action}</span>' +
        ' <a href="#JOIN {$channel}" class="path">{$channel}</a>' +
        '</div>';

    var activeChannels = [];

    self.msgCommand =
    self.messageCommand =
    self.joinCommand =
    self.leaveCommand = function(commandString) {
        var args = commandString.split(/\s+/, 2);
        var channelPath = fixChannelPath(args[1]);
        checkChannel(channelPath);
        sendWithFastestSocket(commandString);
    };

    self.msgResponse =
    self.messageResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/);
        args.shift();
        var channelPath = fixChannelPath(args.shift());
        var user = args.shift();
        var content = args.join(' ');
        checkChannel(channelPath);
        routeResponseToClient('LOG ' + PATH_PREFIX + channelPath + ' ' + MESSAGE_TEMPLATE
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$user}/gi, user)
            .replace(/{\$content}/gi, content)
        );
    };

    self.joinResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/, 3);
        var channelPath = fixChannelPath(args[1]);
        var user = args[2];
        checkChannel(channelPath);
        routeResponseToClient('LOG ' + PATH_PREFIX + channelPath +  ' ' + ACTION_TEMPLATE
            .replace(/{\$action}/gi, 'joined')
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$user}/gi, user)
        );
    };

    self.leaveResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/, 2);
        var channelPath = fixChannelPath(args[1]);
        var user = args[2];
        checkChannel(channelPath);
        routeResponseToClient('LOG ' + PATH_PREFIX + channelPath +  ' ' + ACTION_TEMPLATE
            .replace(/{\$action}/gi, 'left')
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$user}/gi, user)
        );
    };


    function checkChannel(channelPath) {
        if(activeChannels.indexOf(channelPath) === -1) {
            routeResponseToClient("LOG " + PATH_PREFIX + channelPath + ' ' + CHANNEL_TEMPLATE
                .replace(/{\$channel}/gi, channelPath));
            activeChannels.push(channelPath);
            console.info("New active channel: " + channelPath);
        }
    }

    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

    console.log("Loaded Command: join");
})();



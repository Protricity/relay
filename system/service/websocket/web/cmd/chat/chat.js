/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var activeChannels = [];

    var CLASS_CHANNEL_CONTENT = 'channel-content';

    var CHANNEL_TEMPLATE =
        "<link rel='stylesheet' href='cmd/chat/chat.css' type='text/css'>" +
        "<legend>Channel: {$channel}</legend>" +
        "<form name='chat-form' action='#MESSAGE {$channel} $content'>" +
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
        "<input name='content' type='text' class='reset focus' placeholder='Send a message to {$channel}. [hit enter]' />" +
        "<input type='submit' value='Send' />" +
        "</form>";

    var ROW_TEMPLATE

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
        routeResponseToClient('LOG ' + channelPath +
        ' <div class="channel-log">' +
        '<span class="user">' + user + '</span>: ' +
        '<span class="message">' + content + '</span>' +
        '</div>');
    };

    self.joinResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/, 3);
        var channelPath = fixChannelPath(args[1]);
        var user = args[2];
        checkChannel(channelPath);
        routeResponseToClient('LOG ' + channelPath +
        ' <div class="channel-log">' +
        '<span class="user">' + user + '</span>' +
        ' has <span class="action">joined</span>' +
        ' <a href="#JOIN ' + channelPath + '" class="path">' + channelPath + '</a>' +
        '</div>');
    };

    self.leaveResponse = function(commandResponse) {
        var args = commandResponse.split(/\s+/, 2);
        var channelPath = fixChannelPath(args[1]);
        var user = args[2];
        checkChannel(channelPath);
        routeResponseToClient('LOG ' + channelPath +
        ' <div class="channel-log">' +
        '<span class="user">' + user + '</span>' +
        ' has <span class="action">left</span>' +
        ' <a href="#JOIN ' + channelPath + '" class="path">' + channelPath + '</a>' +
        '</div>');
    };


    function checkChannel(channelPath) {
        if(activeChannels.indexOf(channelPath) === -1) {
            routeResponseToClient("LOG " + channelPath + ' ' + CHANNEL_TEMPLATE
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



/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var activeChannels = [];

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';
    var CLASS_INPUT_SUBMIT = 'input-submit';

    var CHANNEL_PREFIX = 'chat:';

    var CHANNEL_TEMPLATE =
        "<link rel='stylesheet' href='cmd/chat/chat.css' type='text/css'>" +
        "<legend>Channel: {$channel}</legend>" +
        "<form name='chat-form' action='#MESSAGE {$channel} $content'>" +
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
        "<input name='content' type='text' class='reset focus' placeholder='Send a message to {$channel}. [hit enter]' />" +
        "<input type='submit' value='Send' />" +
        "</form>";


    self.joinCommand = function (commandString) {
        var args = commandString.split(/\s+/);
        args.shift();
        var channelPath = CHANNEL_PREFIX + fixChannelPath(args.shift());
        if(activeChannels.indexOf(channelPath) === -1) {
            routeResponseToClient("LOG " + channelPath + ' ' + CHANNEL_TEMPLATE
                .replace(/{\$channel}/gi, channelPath));
            activeChannels.push(channelPath);
            console.info("New active channel: " + channelPath);
        }
        sendWithFastestSocket("JOIN " + channelPath + " " + args.join(' '));
    };

    self.joinResponse = function (commandResponse) {
        var args = commandResponse.split(/\s+/);
        args.shift();
        var user = args.shift();
        var channelPath = CHANNEL_PREFIX + fixChannelPath(args.shift());
        if(activeChannels.indexOf(channelPath) === -1) {
            routeResponseToClient("LOG " + channelPath + ' ' + CHANNEL_TEMPLATE
                .replace(/{\$channel}/gi, channelPath));
            activeChannels.push(channelPath);
            console.info("New active channel: " + channelPath);
        }
        routeResponseToClient(commandResponse);
    };

    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

    console.log("Loaded Command: join");
})();



var messageCommand = sendWithFastestSocket;
var messageResponse = routeResponseToClient;
var msgCommand = sendWithFastestSocket;
var msgResponse = routeResponseToClient;

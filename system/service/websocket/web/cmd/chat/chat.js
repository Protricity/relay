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


    self.msgCommand =
    self.messageCommand =
    self.joinCommand = function(commandString) {
        checkCommandAndSend(commandString);
        sendWithFastestSocket(commandString);
    };
    self.msgResponse =
    self.messageResponse =
    self.joinResponse = function(commandResponse) {
        checkCommandAndSend(commandResponse);
        routeResponseToClient(commandResponse);
    };

    function checkCommandAndSend(commandString) {
        var args = commandString.split(/\s+/, 2);
        var channelPath = fixChannelPath(args[1]);
        checkChannel(channelPath);
    }

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



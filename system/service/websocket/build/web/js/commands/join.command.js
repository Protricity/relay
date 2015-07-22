/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var activeChannels = [];

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';
    var CLASS_INPUT_POST = 'input-post';
    var CLASS_INPUT_SUBMIT = 'input-submit';

    var CHANNEL_TEMPLATE =
        "<legend>Channel: {$channel}</legend>" +
        "<form name='chat-form' action='#MESSAGE {$channel}'>" +
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
        "<input type='text' class='" + CLASS_INPUT_POST + "' placeholder='Send a message to {$channel}. [hit enter]' />" +
        "<input type='submit' class='" + CLASS_INPUT_SUBMIT + "' placeholder='Send a message to {$channel}. [hit enter]' />" +
        "</form>";


    self.joinCommand = function (commandString) {
        sendWithFastestSocket(commandString);
        var args = commandString.split(/\s+/);
        args.shift();
        var channelPath = fixChannelPath(args.shift());
        if(activeChannels.indexOf(channelPath) === -1) {
            routeResponseToClient("LOG " + channelPath + ' ' + CHANNEL_TEMPLATE
                .replace(/{\$channel}/gi, channelPath));
            activeChannels.push(channelPath);
            console.info("New active channel: " + channelPath);
        }
    };

    self.joinResponse = function (commandResponse) {
        var args = commandResponse.split(/\s+/);
        args.shift();
        var user = args.shift();
        var path = fixChannelPath(args.shift());
        if(activeChannels.indexOf(path) === -1) {
            routeResponseToClient("LOG " + path + ' ' + CHANNEL_TEMPLATE
                .replace(/{\$channel}/gi, path));
            activeChannels.push(path);
            console.info("New active channel: " + path);
        }
        routeResponseToClient(commandResponse);
    };


    function fixChannelPath(path) {
        if(!/#?[./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        if(path.indexOf("/") === -1 && path.indexOf(".") === -1 && path.charAt(0) != '#')
            path = '#' + path;
        return path;
    }

    console.log("Loaded Command: join");
})();


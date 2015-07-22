/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var activeChannels = [];

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';
    var CLASS_INPUT_POST = 'input-post';

    var CHANNEL_TEMPLATE =
        "<legend>Post to your feed: {$channel}</legend>" +
        "<form name='feed_post' action='#POST {$channel}'>" +
        "<textarea class='" + CLASS_INPUT_POST + "' name='feed_content' placeholder='Anything you like'></textarea>" +
        "<input type='submit' name='feed_submit' value='Post to {$channel}' />" +
        "</form>";


    /**
     *
     * @param commandString POST [channel] [content]
     */
    self.postCommand = function (commandString) {
        var args = commandString.split(/\s+/);
        args.shift();

        var channelPath = args.length > 0 && args[0] ? fixChannelPath(args.shift()) : '/';

        var content = args.join(' ');
        if(!content) {
            routeResponseToClient("RLOG " + channelPath + ' ' + 
                CHANNEL_TEMPLATE
                .replace(/{\$content}/gi, content)
                .replace(/{\$channel}/gi, channelPath)
            );

        } else {
            sendWithFastestSocket(commandString);

        }

    };

    self.postResponse = function (commandResponse) {
        var args = commandResponse.split(/\s+/);
        args.shift();
        var user = args.shift();
        var path = fixChannelPath(args.shift());
        if(activeChannels.indexOf(path) === -1) {
            routeResponseToClient("LOG " + path + CHANNEL_TEMPLATE
                .replace(/{\$channel}/gi, path));
            activeChannels.push(path);
            console.info("New active channel: " + path);
        }
        routeResponseToClient(commandResponse);
    };


    function fixChannelPath(path) {
        if(!path || !/#?[./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        if(path.indexOf("/") === -1 && path.indexOf(".") === -1 && path.charAt(0) != '#')
            path = '#' + path;
        return path;
    }

})();
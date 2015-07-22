/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';

    var CHANNEL_TEMPLATE =
        "<legend>Post to your feed</legend>" +
        "<form name='post-form' action='#POST $channel $content'>" +
        "<textarea class='focus' name='content' required='required' placeholder='Anything you like'>{$content}</textarea>" +
        "<select name='channel' value='{$channel}' >" +
            "<option value='~'>My Feed</option>" +
            "<option disabled='disabled'>Other Feed...</option>" +
            "<option disabled='disabled'>Friend's Feed...</option>" +
        "</select>" +
        "<input type='text' name='channel' value='{$channel}' disabled='disabled' />" +
        "<input type='submit' value='Post' />" +
        "</form>";


    /**
     *
     * @param commandString POST [channel] [content]
     */
    self.postCommand = function (commandString) {
        var args = commandString.split(/\s+/);
        args.shift();

        var channelPath = (args.length > 0 && args[0] ? fixChannelPath(args.shift()) : '~');

        var content = args.join(' ');
        if(!content) {
            routeResponseToClient("RLOG " + channelPath + ' ' +
                CHANNEL_TEMPLATE
                .replace(/{\$content}/gi, content)
                .replace(/{\$channel}/gi, channelPath)
            );

        } else {
            sendWithFastestSocket(commandString); // "POST " + channelPath + ' ' + content);

        }

    };

    self.postResponse = routeResponseToClient;

    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

})();

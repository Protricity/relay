/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'post:';


    var CHANNEL_TEMPLATE =
        "<script src='cmd/post/post-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/post/post.css' type='text/css'>" +
        "<legend>Post to your feed</legend>" +

        "<fieldset class='preview-container'>" +
            "<legend>Preview</legend>" +
            "<div class='preview'></div>" +
        "</fieldset>" +
        "<form name='post-form' action='#' onsubmit='return submitPostForm(event);'>" +
            "<textarea class='focus' name='content' required='required' placeholder='Anything you like'>{$content}</textarea>" +
            "<select name='channel' value='{$channel}' >" +
                "<option value='~'>My Feed</option>" +
                "<option disabled='disabled'>Other Feed...</option>" +
                "<option disabled='disabled'>Friend's Feed...</option>" +
            "</select>" +
            "<input type='text' name='channel' value='{$channel}' disabled='disabled' />" +
            "<input type='password' name='passphrase' style='display:none' placeholder='Enter your PGP Passphrase'/>" +

            "<input type='submit' value='Post' />" +
        "</form>";


    /**
     *
     * @param commandString POST [channel] [timestamp] [content]
     */
    self.postCommand = function (commandString) {
        var args = commandString.split(/\s+/);
        args.shift();

        var channelPath = (args.length > 0 && args[0] ? fixChannelPath(args.shift()) : '~');

        var content = args.join(' ');
        if(!content) {
            routeResponseToClient("RLOG " + PATH_PREFIX + channelPath + ' ' +
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

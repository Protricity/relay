/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'post:';


    var CHANNEL_TEMPLATE =
        "<script src='cmd/post/post-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/post/post.css' type='text/css'>" +
        "<legend>Post to your feed</legend>" +

        "<form name='post-form' action='#' onsubmit='return submitPostForm(event);'>" +
            "<label class='label-content'>Use this text box to create a new feed post:<br/><i>Your post will be appear on your subscribers' feeds</i><br/>" +
                "<textarea cols='56' rows='8' onfocus='focusPostForm(event)' class='focus' name='content' required='required' placeholder='Post anything you like'>{$content}</textarea>" +
            "<br/></label>" +

            "<label class='label-pgp-id'>Post with (PGP Identity):<br/>" +
                "<select name='pgp-id' required='required' onfocus='focusPostForm(event)' onselect='focusPostForm(event)' oninput='focusPostForm(event)'>" +
                    "<optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>" +
                    "</optgroup>" +
                    "<optgroup disabled='disabled' label='Other options'>" +
                        "<option value=''>Manage PGP Identities...</option>" +
                    "</optgroup>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-channel'>Post to:<br/>" +
                "<select name='channel'>" +
                    "<option value='~'>My Feed</option>" +
                    "<option disabled='disabled'>Other Feed...</option>" +
                    "<option disabled='disabled'>Friend's Feed...</option>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-recipients'>Choose which subscribers may view this post:<br/>" +
                "<select name='recipients'>" +
                    "<option value='*'>Everybody</option>" +
                    "<option disabled='disabled'>My friends</option>" +
                    "<option disabled='disabled'>Friends of Friends</option>" +
                    "<option disabled='disabled'>Specific Recipients</option>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-passphrase' style='display: none'>PGP Passphrase (if required):<br/>" +
                "<input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>" +
            "<br/><br/></label>" +

            "<label class='label-post-form'>Submit your post:<br/>" +
                "<input type='submit' value='Post' name='submit-post-form' />" +
            "</label>" +
        "</form>" +
        "<fieldset class='preview-container' style='display: none'>" +
            "<legend>Preview</legend>" +
            "<div class='preview'></div>" +
        "</fieldset>";

    /**
     *
     * @param commandString POST [channel] [content]
     */
    self.postCommand = function (commandString) {
        var match = /^post\s*(.*)\s*([\s\S]*)?$/im.exec(commandString);
        var channelPath = fixChannelPath(match[1] || '~');

        var content = match[2] || '';
        routeResponseToClient("RLOG " + PATH_PREFIX + channelPath + ' ' +
            CHANNEL_TEMPLATE
            .replace(/{\$content}/gi, content)
            .replace(/{\$channel}/gi, channelPath)
        );

    };

    self.postResponse = routeResponseToClient;

    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

})();

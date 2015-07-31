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
            "<label>Post anything you like:<br/>" +
                "<textarea onfocus='focusPostForm(event)' class='focus' name='content' required='required' placeholder='Anything you like'>{$content}</textarea>" +
            "</label>" +
            "<br/><label>Post with (PGP Identity):<br/>" +
                "<select name='pgp-id' required='required' onfocus='focusPostForm(event)' onselect='focusPostForm(event)' oninput='focusPostForm(event)'>" +
                    "<optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>" +
                    "</optgroup>" +
                    "<optgroup disabled='disabled' label='Other options'>" +
                        "<option value=''>Manage PGP Identities...</option>" +
                    "</optgroup>" +
                    "</select>" +
            "</label>" +
            "<label style='display: none'><br/><br/>Post to:<br/>" +
                "<select name='channel'>" +
                    "<option value='~'>My Feed</option>" +
                    "<option disabled='disabled'>Other Feed...</option>" +
                    "<option disabled='disabled'>Friend's Feed...</option>" +
                "</select>" +
            "</label>" +

            "<label style='display: none'><br/><br/>PGP Passphrase (if required):<br/>" +
                "<input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>" +
            "</label>" +

            "<br/><br/><label>Submit your post:<br/>" +
                "<input type='submit' value='Post' />" +
            "</label>" +
        "</form>" +
        "<fieldset class='preview-container' style='display: none'>" +
            "<legend>Preview</legend>" +
            "<div class='preview'></div>" +
        "</fieldset>";

    self.spostCommand = function (commandString) {
        sendWithFastestSocket(commandString); // "POST " + channelPath + ' ' + content);
        //if(typeof openpgp == 'undefined')
        //    importScripts('../cmd/pgp/lib/openpgpjs/openpgp.js');
        //
        //var match = /^spost\s+(.*)$/im.exec(commandString);
        //console.log(commandString);
        //
        //var packetlist = new openpgp.packet.List();
        //packetlist.read(match[1]);
        //var newMessage = new openpgp.CleartextMessage(input.text, packetlist);
        //console.log(newMessage);
    };

    self.spostResponse = routeResponseToClient;

    /**
     *
     * @param commandString POST [channel] [content]
     */
    self.postCommand = function (commandString) {
        var match = /^post\s*(.*)\s*([\s\S]*)?$/im.exec(commandString);
        var channelPath = fixChannelPath(match[1] || '~');

        //if(match && match[2]) {
            var content = match[2] || '';
            //sendWithFastestSocket(commandString); // "POST " + channelPath + ' ' + content);

        //} else {
            routeResponseToClient("RLOG " + PATH_PREFIX + channelPath + ' ' +
                CHANNEL_TEMPLATE
                .replace(/{\$content}/gi, content)
                .replace(/{\$channel}/gi, channelPath)
            );


        //}

    };

    self.postResponse = routeResponseToClient;

    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

})();

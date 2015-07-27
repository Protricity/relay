/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'pgp:';

    var KEYGEN_CLOSED_TEMPLATE =
        "<legend><a href='#KEYGEN'>Generate a new PGP Key Pair</a></legend>";

    var GENERATE_TEMPLATE =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Generate a new PGP Key Pair</legend>" +
        "<form name='pgp-keygen-form' action='#' onsubmit='return submitPGPKeyGenForm(event);'>" +
            "<div class='status-box'>Generate a new PGP Key Pair</div>" +
            "Select key strength:<br/>" +
            "<select name='bits'>" +
                "<option value='512'>512 (Weak)</option>" +
                "<option value='1024' selected='selected'>1024 (Casual)</option>" +
                "<option value='2048'>2048 (Strong)</option>" +
                "<option value='4096'>4096 (Very strong)</option>" +
            "</select>" +
            "<br/><br/>Select a user ID (Can be a user name, email address, or both in the format <i>'Your Name' &lt;your@email.com&gt;</i>:<br/> " +
            "<input type='text' name='user_id' value='{$user_id}' required='required' placeholder='User ID and/or email [ ex. \"Your Name\" <your@email.com> ]' />" +

            "<br/><br/>Optionally choose a passphrase to secure your PGP Key Pair (You will be asked for the passphrase any time the private key is used):<br/> " +
            "<input type='password' name='passphrase' />" +

            "<br/><br/>Generate:<br/> " +
            "<input type='submit' value='Generate' />" +
            " or <a href='#REGISTER'>Load your own PGP private key</a>" +
        "</form>";

    var REGISTER_TEMPLATE =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Register a new PGP Key Pair</legend>" +
        "<form name='pgp-register-form' action='#' onsubmit='return submitPGPRegisterForm(event);'>" +
            "<div class='status-box'>Load or generate a PGP Private key and enter it into the box below to register</div>" +
            "Enter your PGP Private Key block<br/>" +
            "<textarea name='private_key' required='required' placeholder='Your private key' rows='12' cols='64'>{$private_key}</textarea>" +

            "<br/><br/>Register:<br/>" +
            "<input type='submit' name='submit_register' value='Register'/>" +
            " or <a href='#KEYGEN'>Generate a new PGP Key pair</a>" +
        "</form>";


    /**
     * @param commandString KEYGEN [channel] [timestamp] [content]
     */
    self.keygenCommand = function (commandString) {
        routeResponseToClient("RLOG pgp:keygen " + GENERATE_TEMPLATE
                .replace(/{\$user_id}/gi, '')
                .replace(/{\$private_key}/gi, '')
        );
    };

    self.keygenResponse = function(e) {
        throw new Error("keygen response is not implemented");
    };

    /**
     * @param commandString REGISTER
     */
    self.registerCommand = function (commandString) {
        var private_key_content = '';
        var match = /^register\s+([\s\S]*)$/im.exec(commandString);
        if(match && match[1])
            private_key_content = match[1].replace(/(\r\n|\r|\n)/g, '\r\n');
        
        routeResponseToClient("RLOG pgp:keygen " + KEYGEN_CLOSED_TEMPLATE);
        routeResponseToClient("RLOG pgp:register " + REGISTER_TEMPLATE
                .replace(/{\$user_id}/gi, '')
                .replace(/{\$private_key}/gi, private_key_content)
        );
    };

    self.registerResponse = function(e) {
        throw new Error("keygen response is not implemented");
    };

    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

})();

/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'pgp:';

    var KEYGEN_CLOSED_TEMPLATE =
        "<legend><a href='#KEYGEN'>Generate a new PGP Key Pair</a></legend>";

    var EXAMPLE_PUBLIC_KEY = 
    "Example: \n\n"
    +"-----BEGIN PGP PUBLIC KEY BLOCK-----\n"
    +"Version: pgpwnt v3.0a\n"
    +"Comment: pgpwned by pgpwnt\n"
    +"\n"
    +"mQENBFWZ6r0BCACakVSmgG6NaFlTbJxxdJMQHIDC16e2ospVoVkFunTiD7uQ+da3\n"
    +"5Y5Ewjv5skMcVkmAilWxtDQWwdgb+mv9SqpT3FmDEp7pPtDl/1tMZQyTQfjQ3+YC\n"
    +"a/6tAGx7p3Abi/7UXkz/3Yh3x+Oin71EHlE0mhqIgbwh8UQOP+q6+CH0SYeCPPir\n"
    +"t5+gsSSoME4ZMMxLE9osTGpYwsOE6Y4iO9oeqjAuOglWqMeRWIaUH4Om8N1IVhJF\n"
    +"oSMzTby91x0OaEePDtTHW/h6rD4ZAZoj20dxutApYHo29lVUhEY2gLrdptgw8E5I\n"
    +"SSJj8fIhZiO6o2ZLkqcCmJqd6BwoaZW+FWKPABEBAAG0EWd1ZXN0QHJlbGF5LmNv\n"
    +"LmlsiQEcBBABAgAGBQJVmeq9AAoJEFeCpFUFcZCa7G8IAIsfFF4RwEah2JIM1+VB\n"
    +"GOBilAvTcEyOhOn93Rfih2I9UMYWhAflvwi0FtAkZ4ysY1j7F4frnQ4E/6f9sNjm\n"
    +"5wMPwiEPaoSTFcEKVDNHV3qcGjCcyXtpKYY0afm3GZK8Rcc5IouDC4tHMYbmVAav\n"
    +"7YsfSRMoCw1c+6FWoE2S3A0v6uKLiq9Yux+FC36X+eXlkzp+nqCSjZ3AOC/zDPHv\n"
    +"HtZIfS7yaKJeMKdA31q4c5h0Ts3t8ojW7K/Q/v5s1LlqxM3zDx/5KsO657AKcgmv\n"
    +"1EOWmy8OyRH7M7FXN3bcU34g0hHhNWdD+n0ew0COydgj5ZMzulY5Su1hrG0UNasX\n"
    +"/Bw=\n"
    +"=E+6i\n"
    +"-----END PGP PUBLIC KEY BLOCK-----";

    var GENERATE_TEMPLATE =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Generate a new PGP Key Pair</legend>" +
        "<form name='pgp-keygen-form' action='#' onsubmit='return submitPGPKeyGenForm(event);'>" +
            "<div class='status-box' style='display: none'></div>" +
            "Select key strength: </br><i>or: your fear level for getting hacked on a scale from 512 to 4096</i><br/>" +
            "<select name='bits'>" +
                "<option value='512'>512 (Weak)</option>" +
                "<option value='1024' selected='selected'>1024 (Casual)</option>" +
                "<option value='2048'>2048 (Strong)</option>" +
                "<option value='4096'>4096 (Very strong)</option>" +
            "</select>" +
            "<br/><br/>Select a user ID: <br/><i>Can be a user name, email address, or both in the format <br/><strong>'Your Name' &lt;your@email.com&gt;</strong></i><br/> " +
            "<input type='text' name='user_id' value='{$user_id}' required='required' placeholder='User ID and/or email [ ex. \"Your Name\" <your@email.com> ]' />" +

            "<br/><br/>Optionally choose a passphrase to secure your PGP Key Pair: <br/><i>You will be asked for the passphrase <br/>any time your private key is used</i><br/> " +
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
        "<div class='status-box' style='display: none'></div>" +
        "<label>Paste or <a href='#KEYGEN'>generate</a> a PGP Private key and <br/>enter it into the box below to register:<br/>" +
        "<textarea name='private_key' required='required' placeholder='" + EXAMPLE_PUBLIC_KEY + "' rows='12' cols='68'>{$private_key}</textarea>" +
        "</label>" +
        "<br/><br/>Register:<br/>" +
        "<input type='submit' name='submit_register' value='Register'/>" +
        " or <a href='#KEYGEN'>Generate a new PGP Key pair</a>" +
        "</form>";

    var MANAGE_TEMPLATE =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Manage PGP Identities</legend>" +
        "<form name='pgp-manage-form' action='#' onsubmit='return submitPGPManageForm(event);'>" +
        "<div class='status-box' style='display: none'></div>" +
        "<div class='pgp-id-box'><button class='load-pgp-btn' onclick='focusPGPManageForm(event)'>Click to load PGP Identities</button></div>" +
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
        var match = /^register\s*([\s\S]*)$/im.exec(commandString);
        if(match && match[1])
            private_key_content = match[1].replace(/(\r\n|\r|\n)/g, '\r\n');

        //routeResponseToClient("RLOG pgp:keygen " + KEYGEN_CLOSED_TEMPLATE);
        routeResponseToClient("RLOG pgp:keygen " + REGISTER_TEMPLATE
                .replace(/{\$user_id}/gi, '')
                .replace(/{\$private_key}/gi, private_key_content)
        );
    };

    self.registerResponse = function(e) {
        throw new Error("keygen response is not implemented");
    };

    /**
     * @param commandString MANAGE
     */
    self.manageCommand = function (commandString) {
        //var match = /^manage$/im.exec(commandString);

        routeResponseToClient("RLOG pgp:manage " + MANAGE_TEMPLATE
                //.replace(/{\$user_id}/gi, '')
        );
    };

    self.manageResponse = function(e) {
        throw new Error("manage response is not implemented");
    };

    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

})();

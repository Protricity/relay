/**
 * Created by ari on 6/19/2015.
 */


var Templates = Templates || {};
Templates.pgp = Templates.pgp || {};
Templates.pgp.register = Templates.pgp.register || {};
Templates.pgp.register.form = function(private_key_block, status_content, callback) {

    var REGISTER_TEMPLATE = "\
            <article class='channel pgp:'>\n\
                <script src='pgp/pgp-listeners.js'></script>\n\
                <link rel='stylesheet' href='pgp/pgp.css' type='text/css'>\n\
                <header class='header-bar'>\n\
                    <a href='#MAXIMIZE pgp:'>\n\
                        <span class='command'>Register</span> a new PGP Key Pair\n\
                    </a>\n\
                </header>\
                <div class='header-bar-buttons'>\n\
                    <a href='#MINIMIZE pgp:'>[-]</a><!--\n\
                 --><a href='#MAXIMIZE pgp:'>[+]</a><!--\n\
                 --><a href='#CLOSE pgp:'>[x]</a>\n\
                </div>\n\
                <form name='pgp-register-form' action='#' method='post' >\n\
                    <code class='status-box'>{$status_content}</code><br/>\n\
                    <label><strong>Paste a PGP Private key block into the box below to register:</strong><br/>\n\
                        <textarea name='private_key' required='required' placeholder='{$example_public_key}' rows='12' cols='68'>{$private_key_block}</textarea>\n\
                    </label>\n\
                    <br/><br/><span class='text-register'>Register</span>:<br/>\n\
                    <input type='submit' name='submit-register' value='Register'/>\n\
                    or <a href='#KEYGEN'>Generate a new PGP Key pair</a>\n\
                </form>\n\
            </article>";

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


    // Callback
    callback(REGISTER_TEMPLATE
        .replace(/{\$status_content}/gi, status_content || '')
        .replace(/{\$private_key_block}/gi, private_key_block)
        .replace(/{\$example_public_key}/gi, EXAMPLE_PUBLIC_KEY)
    );
};

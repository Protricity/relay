/**
 * Created by ari on 6/19/2015.
 */


var Templates = Templates || {};
Templates.pgp = Templates.pgp || {};
Templates.pgp.generate = Templates.pgp.generate || {};
Templates.pgp.generate.form = function(user_id, callback) {
    var GENERATE_TEMPLATE = "\
        <article class='channel pgp:'>\n\
            <script src='pgp/pgp-listeners.js'></script>\n\
            <link rel='stylesheet' href='pgp/pgp.css' type='text/css'>\n\
            <header class='header-bar show-on-minimized'>\n\
                <a href='#MAXIMIZE pgp:'>\n\
                    <span class='command'>Generate</span> a New Identity\n\
                </a>\n\
            </header>\
            <div class='header-bar-buttons show-on-minimized'>\n\
                <a href='#MINIMIZE pgp:'>[-]</a><!--\n\
             --><a href='#MAXIMIZE pgp:'>[+]</a><!--\n\
             --><a href='#CLOSE pgp:'>[x]</a>\n\
            </div>\n\
            <form name='pgp-keygen-form' action='#' method='post'>\n\
                <code class='status-box'>Use this form to generate a new PGP Key Identity</code>\n\
                \
                <label><br/><strong>Select key strength: </strong><br />\
                (<i class='info'>or: your fear level for getting hacked<br/>on a scale from 512 to 4096</i>)<br/>\n\
                <select name='bits'>\n\
                    <option value='512'>512 (Weak Sauce)</option>\n\
                    <option value='1024' selected='selected'>1024 (Casual Security)</option>\n\
                    <option value='2048'>2048 (Stronger Security)</option>\n\
                    <option value='4096'>4096 (Very Stronger Security)</option>\n\
                </select>\n\
                <br/></label>\n\
                \
                <label><br/><strong>Select a user ID: </strong><br/>\
                (<i class='info'>can be a user name, email address, or both)</i><br/> \n\
                <input type='text' name='user_id' value='{$user_id}' required='required' size='36' placeholder='\"Your Name\" <your@email.com>' />\n\
                <br/></label>\
                \
                <label><br/><strong>Optionally choose a passphrase to secure your PGP Key Pair: </strong><br/>\
                (<i class='info'>You will be asked for the passphrase <br/>any time your private key is used</i>)<br/> \n\
                <input type='password' name='passphrase' />\n\
                <br/></label>\
                \
                <label><br/><strong>Generate:</strong><br/> \n\
                (<i class='info'>Generate a new PGP Public/Private Key Pair Identity</i>)<br/> \n\
                <input type='submit' value='Generate'  name='submit-generate' />\n\
                </label>\
                or <a href='#REGISTER'>Load your own PGP private key</a>\n\
            </form>\n\
        </article>";

    // Callback
    callback(GENERATE_TEMPLATE
        .replace(/{\$user_id}/gi, user_id.replace(/</g, '&lt;'))
        //.replace(/{\$send_as_socket_command}/gi, send_as_socket_command ? '1' : '0')
    );
};

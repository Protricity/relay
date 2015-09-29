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
            <legend class='title'><span class='command'>Generate</span> a new Identity</legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE pgp:'>[-]</a><!--\
                 --><a class='title-command-maximize' href='#MAXIMIZE pgp:'>[+]</a><!--\
                 --><a class='title-command-close' href='#CLOSE pgp:'>[x]</a>\n\
            </div>\n\
            <form name='pgp-keygen-form' action='#' method='post'>\n\
                <code class='status-box' style='display: none'></code><br/>\n\
                Select key strength: </br><i>or: your fear level for getting hacked on a scale from 512 to 4096</i><br/>\n\
                <select name='bits'>\n\
                    <option value='512'>512 (Weak)</option>\n\
                    <option value='1024' selected='selected'>1024 (Casual)</option>\n\
                    <option value='2048'>2048 (Strong)</option>\n\
                    <option value='4096'>4096 (Very strong)</option>\n\
                </select>\n\
                <br/><br/>Select a user ID: <br/><i>Can be a user name, email address, or both in the format <br/><strong>'Your Name' &lt;your@email.com&gt;</strong></i><br/> \n\
                <input type='text' name='user_id' value='{$user_id}' required='required' placeholder='User ID and/or email [ ex. \"Your Name\" <your@email.com> ]' />\n\
                <br/><br/>Optionally choose a passphrase to secure your PGP Key Pair: <br/><i>You will be asked for the passphrase <br/>any time your private key is used</i><br/> \n\
                <input type='password' name='passphrase' />\n\
                <br/><br/>Generate:<br/> \n\
                <input type='submit' value='Generate'  name='submit-generate' />\n\
                or <a href='#REGISTER'>Load your own PGP private key</a>\n\
            </form>\n\
        </article>";

    // Callback
    callback(GENERATE_TEMPLATE
        .replace(/{\$user_id}/gi, user_id.replace(/</, '&lt;'))
        //.replace(/{\$send_as_socket_command}/gi, send_as_socket_command ? '1' : '0')
    );
};

/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.pgp = Templates.pgp || {};
Templates.pgp.key = Templates.pgp.manage || {};
Templates.pgp.key.form = function(publicKeyData, callback) {

    // Template
    var PUBLIC_KEY_TEMPLATE = "\
        <article class='channel pgp-public-key:{$id_public}'>\n\
            <script src='pgp/pgp-listeners.js'></script>\n\
            <link rel='stylesheet' href='pgp/pgp.css' type='text/css'>\n\
            <legend class='title'><span class='command'>Key</span> {$id_public_short}</legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE pgp-public-key:{$id_public}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE pgp-public-key:{$id_public}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE pgp-public-key:{$id_public}'>[x]</a>\n\
            </div>\n\
            <form name='pgp-public-key-form' action='#'>\n\
                <strong>ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='fingerprint'>{$id_public}</span><br/>\n\
                <strong>User ID:&nbsp;&nbsp;&nbsp;</strong> <span class='user'>{$user_id}</span><br/>\n\
                <strong>Email:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='email'>{$user_email}</span><br/>\n\
            </form>\n\
        </article>";

    var status_content = "";

    var keyID = publicKeyData.id_public.toUpperCase();
    // Callback
    callback(PUBLIC_KEY_TEMPLATE
        .replace(/{\$status_content}/gi, status_content || '')
        .replace(/{\$id_public}/gi, keyID || '')
        .replace(/{\$id_public_short}/gi, keyID.substr(keyID.length - 8))
        .replace(/{\$block_public}/gi, publicKeyData.block_public)
        .replace(/{\$user_id}/gi, publicKeyData.user_id.replace(/</, '&lt;'))
        .replace(/{\$user_name}/gi, publicKeyData.user_name || '')
        .replace(/{\$user_email}/gi, publicKeyData.user_email || '')
        .replace(/{\$user_comment}/gi, publicKeyData.user_comment || ''),
        'pgp-public-key:' + keyID
    );
};


/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.pgp = Templates.pgp || {};
Templates.pgp.manage = Templates.pgp.manage || {};
Templates.pgp.manage.form = function(status_content, callback) {

    // Template
    var MANAGE_TEMPLATE = "\
        <article class='channel pgp:'>\n\
            <script src='pgp/pgp-listeners.js'></script>\n\
            <link rel='stylesheet' href='pgp/pgp.css' type='text/css'>\n\
            <legend class='title'><span class='command'>Manage</span> PGP Identities</legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE pgp-manage:'>[-]</a><!--\
                 --><a class='title-command-maximize' href='#MAXIMIZE pgp-manage:'>[+]</a><!--\
                 --><a class='title-command-close' href='#CLOSE pgp-manage:'>[x]</a>\n\
            </div>\n\
            <form name='pgp-manage-form' action='#'>\n\
                <code class='status-box'>{$status_content}</code>\n\
                <br/>\
                <div class='pgp-manage-entries:'></div>\n\
                <label><strong>Action:&nbsp;&nbsp;</strong> <span class='action span-action'>No Keys Selected</span></label><br/>\n\
                <label><strong>Client:</strong> \n\
                    <select name='action'>\n\
                        <option value=''>Select action</option>\n\
                        <option value='default {$id_private_list}'>Make Default Identity</option>\n\
                        <option value='@passphrase {$id_private}'>Change Password</option>\n\
                        <option value='sign {$id_private_list}'>Sign Message</option>\n\
                        <option value='verify {$id_private_list}'>Verify Message</option>\n\
                        <option value='encrypt {$id_private_list}'>Encrypt Message</option>\n\
                        <option value='decrypt {$id_private_list}'>Decrypt Message</option>\n\
                        <option value='@export.public {$id_private}'>Export Public Key Block</option>\n\
                        <option value='@export.private {$id_private}'>Export Private Key Block</option>\n\
                        <option value='@unregister {$id_private}'>Unregister Private Key Identity</option>\n\
                        <option value='keygen'>Generate a new Identity</option>\n\
                    </select>\n\
                </label><br/>\n\
                <label><strong>Submit:&nbsp;&nbsp;</strong> <input type='submit' /><br/>\n\
            </form>\n\
        </article>";

    // Callback
    callback(MANAGE_TEMPLATE
        .replace(/{\$status_content}/gi, status_content || '')
    );
};


Templates.pgp.manage.entry = function(contentEntry, callback) {
    var MANAGE_TEMPLATE_ENTRY = "\
        <label>\n\
            <fieldset class='pgp-id-box pgp-id-box:{$id_public}{$class}'>\n\
                <legend class='title'>\n\
                    <input type='checkbox' value='{$id_public}' name='selected:{$id_public}'/> <span class='user'>{$user_id}</span>\n\
                </legend>\n\
                <strong>Public ID:&nbsp;&nbsp;</strong> <span class='fingerprint'>{$id_public}</span><br/>\n\
                <strong>Private ID:&nbsp;</strong> <span class='fingerprint'>{$id_private}</span><br/>\n\
                <strong>User ID:&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='user'>{$user_id}</span><br/>\n\
                <strong>Passphrase:&nbsp;</strong> {$passphrase_required}<br/>\n\
            </fieldset>\n\
        </label>";

    // Callback
    callback(MANAGE_TEMPLATE_ENTRY
            .replace(/{\$id_private}/gi, contentEntry.pgp_id_private)
            .replace(/{\$id_public}/gi, contentEntry.pgp_id_public)
            .replace(/{\$id_private_short}/gi, contentEntry.pgp_id_private.substr(contentEntry.pgp_id_private.length - 8))
            .replace(/{\$id_public_short}/gi, contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8))
            //.replace(/{\$block_private}/gi, privateKeyBlock)
            //.replace(/{\$block_public}/gi, privateKeyData.block_public)
            .replace(/{\$user_id}/gi, contentEntry.user_id.replace(/</, '&lt;'))
            //.replace(/{\$user_name}/gi, privateKeyData.user_name || '')
            //.replace(/{\$user_email}/gi, privateKeyData.user_email || '')
            //.replace(/{\$user_comment}/gi, privateKeyData.user_comment || '')
            .replace(/{\$passphrase_required}/gi, contentEntry.passphrase_required ? "Yes" : "No")
            //.replace(/{\$is_default}/gi, privateKeyData.default === '1' ? "<strong>Yes</strong>" : "No")
            //.replace(/{\$class}/gi, privateKeyData.default === '1' ? " pgp-id-box-default" : "")
            //.replace(/{\$default}/gi, privateKeyData.default)
    );
};

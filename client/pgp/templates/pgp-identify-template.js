/**
 * Created by ari on 6/19/2015.
 */


var Templates = Templates || {};
Templates.pgp = Templates.pgp || {};
Templates.pgp.identify = Templates.pgp.identify || {};
Templates.pgp.identify.form = function(responseString, socket_url, CONFIG, callback) {

    var IDENTIFY_TEMPLATE = "\
        <article class='channel identify:'>\n\
            <script src='pgp/pgp-listeners.js'></script>\n\
            <link rel='stylesheet' href='pgp/pgp.css' type='text/css'>\n\
            <legend class='title'><span class='command'>Identify</span> yourself to the network</legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE identify:'>[-]</a><!--\
                 --><a class='title-command-maximize' href='#MAXIMIZE identify:'>[+]</a><!--\
                 --><a class='title-command-close' href='#CLOSE identify:'>[x]</a>\n\
            </div>\n\
            <form class='{$form_class}' name='pgp-identify-form' action='#' method='post'>\n\
                <code class='status-box'>{$status_content}</code><br/>\n\
                <label class='label-pgp-id'>Identify using PGP Identity:<br/>\n\
                    <select name='pgp_id_private' required='required'>\n\
                        <option value=''>Select a PGP Identity</option>\n\
                        <optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>\n\
                            {$html_pgp_id_private}\n\
                        </optgroup>\n\
                        <optgroup label='Other options'>\n\
                            <option value='' disabled='disabled'>Manage PGP Identities...</option>\n\
                            <option value='' disabled='disabled'>Look up Identity...</option>\n\
                        </optgroup>\n\
                    </select>\n\
                <br/><br/></label>\n\
                <label class='label-passphrase show-on-passphrase-required'>PGP Passphrase (if required):<br/>\n\
                    <input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>\n\
                <br/><br/></label>\n\
                <label class='label-username hide-on-idsig-required'>Your <strong>Session Username</strong>:<br/>(how you appear to others while connected)<br/>\n\
                    <input type='text' name='username' required='required' placeholder='Enter a user name' value='{$username}'/>\n\
                <br/><br/></label>\n\
                <label class='hide-on-idsig-required'>\n\
                    <hr/>Submit Identification Signature:<br/>\n\
                    <input type='submit' name='submit-identify' value='Identify'/>\n\
                    <select name='auto_identify' class='show-on-succes' style='width:16em;'>\n\
                        <option value='ask'>Ask me every time</option>\n\
                        <option {$auto_identify_host_attr}value='auto-host'>Auto-Identify to {$socket_host} (passphrase may be required)</option>\n\
                        <option {$auto_identify_all_attr}value='auto-all'>Auto-Identify to all hosts (passphrase may be required)</option>\n\
                    </select>\n\
                <br/><br/></label>\n\
                <label class='label-visibility hide-on-passphrase-required'>How should other users be allowed to interact<br/>with your client while connected?<br/>\n\
                    <select multiple='multiple' name='visibility' style='max-width:20em' size='6'>\n\
                        <optgroup label='Visibility Options'>\n\
                            <option selected='selected' value='M'>[MESSAGE] Accept private messages from other users</option>\n\
                            <option selected='selected' value='G'>[GET] Accept Content requests (like feed posts)</option>\n\
                            <option value='P'>[POST] Content Hosting with form submission (allow others to make HTTP POST requests to your client)</option>\n\
                            <option value='U'>[PUT] Content Hosting with content submission (allow others to post content your feed)</option>\n\
                            <option value='D'>[DELETE] Content Hosting with delete requests (allow others to delete content from your feed)</option>\n\
                        </optgroup>\n\
                        <optgroup label='Visibility Combos'>\n\
                            <option value='_'>[] No Visibility (No one can tell you're on a server until you join a channel)</option>\n\
                            <option value='_M'>[M] Accept private messages from other users (no one can see your feed)</option>\n\
                            <option value='_MG'>[MG] Accept Content requests (like feed posts) and private messages</option>\n\
                            <option value='_MGP'>[MGP] Content Hosting with form submission (allow others to post to your feed)</option>\n\
                            <option value='_MGPUD'>[MGPUD] Content Hosting with POST/PUT/DELETE requests (allow others to help manage your feed)</option>\n\
                        </optgroup>\n\
                    </select>\n\
                <br/><br/></label>\n\
                <label class='hide-on-idsig-required'><hr/>This is your <strong>Identification Signature</strong> for this session<br/>(What others see when they request your <i>IDSIG</i>):<br/>\n\
                    <textarea disabled='disabled' name='id_signature' rows='6' cols='68'>{$id_signature}</textarea>\n\
                <br/></label>\n\
                <input type='hidden' name='session_uid' value='{$session_uid}'/>\n\
                <input type='hidden' name='socket_host' value='{$socket_host}'/>\n\
            </form>\n\
        </article>";

    var socket_host = socket_url.split('/')[2];
    var match = /^identify\s+(\S*)/im.exec(responseString);
    if(!match)
        throw new Error("Invalid IDENTIFY: " + responseString);
    var session_uid = match[1];

    var status_content = "<span class='info'>IDENTIFY request received from</br>[" + socket_url + "]</span>";



    var form_classes = [];
    var html_pgp_id_private_html = '';
    var auto_identify_host_attr = '';
    var auto_identify_all_attr = '';
    var pgpIDCount = 0;
    var selectedPGPPrivateKeyID = null;
    var selectedPGPDefaultUsername = null;

    if(typeof PGPDB !== 'function')
        importScripts('pgp/pgp-db.js');

    PGPDB.queryPrivateKeys(function(privateKeyData) {
        var defaultUsername = privateKeyData.user_name || privateKeyData.user_id;
        defaultUsername = defaultUsername.trim().split(/@/, 2)[0].replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_');
        var optionValue = privateKeyData.id_private + "," + privateKeyData.id_public + "," + defaultUsername + (privateKeyData.passphrase_required ? ',1' : ',0');

        if(privateKeyData.default === '1') {
            selectedPGPDefaultUsername = defaultUsername;
            if(!selectedPGPPrivateKeyID)
                selectedPGPPrivateKeyID = privateKeyData.id_private;
            if(!privateKeyData.passphrase_required) {
                if(CONFIG) {
                    var autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
                    if (autoIdentify) {
                        selectedPGPPrivateKeyID = autoIdentify;
                        form_classes.push('auto-identify');
                    }
                    if (CONFIG['autoIdentifyHost:' + socket_host])
                        auto_identify_host_attr = "selected='selected'";
                    else if (CONFIG['autoIdentify'])
                        auto_identify_all_attr = "selected='selected'";
                }

            } else {
                console.info("Passphrase required for: ", privateKeyData);
                form_classes.push('passphrase-required');
            }
        }

        html_pgp_id_private_html +=
            '<option' + (privateKeyData.id_private === selectedPGPPrivateKeyID ? ' selected="selected"' : '') + ' value="' + optionValue + '">' +
            (privateKeyData.passphrase_required ? '(*) ' : '') + privateKeyData.user_id.replace(/</, '&lt;') +
            '</option>';

        pgpIDCount++;

    }, function() {
        if(pgpIDCount === 0)
            status_content += "<br/><span class='error'>No PGP Private Keys found on the client. Please import or <a href='#KEYGEN' onclick='send(\"KEYGEN\");'>generate</a> a new PGP Key and re-<a href='#IDENTIFY' onclick='send(\"IDENTIFY\");'>identify</a>.</span>";


        // Callback
        callback(IDENTIFY_TEMPLATE
                .replace(/{\$form_class}/gi, form_classes.join(' '))
                .replace(/{\$status_content}/gi, status_content || '')
                .replace(/{\$id_signature}/gi, '')
                .replace(/{\$socket_url}/gi, socket_url || '')
                .replace(/{\$socket_host}/gi, socket_host || '')
                .replace(/{\$html_pgp_id_private}/gi, html_pgp_id_private_html || '')
                .replace(/{\$session_uid}/gi, session_uid || '')
                .replace(/{\$auto_identify_host_attr}/gi, auto_identify_host_attr || '')
                .replace(/{\$auto_identify_all_attr}/gi, auto_identify_all_attr || '')
                .replace(/{\$username}/gi, selectedPGPDefaultUsername) // username.replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_') || '')
        );
    });

};


Templates.pgp.identify.successForm = function(idsigString, socket_url, CONFIG, callback) {

    var IDENTIFY_TEMPLATE_SUCCESS = "\
        <article class='channel identify:'>\n\
            <script src='pgp/pgp-listeners.js'></script>\n\
            <link rel='stylesheet' href='pgp/pgp.css' type='text/css'>\n\
            <legend class='title'><span class='command'>IDSIG</span> Successful</legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE identify:'>[-]</a><!--\
                 --><a class='title-command-maximize' href='#MAXIMIZE identify:'>[+]</a><!--\
                 --><a class='title-command-close' href='#CLOSE identify:'>[x]</a>\n\
            </div>\n\
            <form name='pgp-identify-success-form' action='#CLOSE identify:' onsubmit=''>\n\
                <code class='status-box'>{$status_content}</code><br/>\n\
                Options for next time:<hr/>\n\
                <button type='submit' name='submit-close'>\n\
                    <a class='title-command-close' href='#CLOSE identify:'>Close</a>\n\
                </button>\n\
                <select name='auto_identify' style='width:16em;'>\n\
                    <option value='ask'>Ask me every time</option>\n\
                    <option {$auto_identify_host_attr}value='auto-host'>Auto-Identify to {$socket_host} (passphrase may be required)</option>\n\
                    <option {$auto_identify_all_attr}value='auto-all'>Auto-Identify to all hosts (passphrase may be required)</option>\n\
                </select>\n\
                <input type='hidden' name='pgp_id_private' value='{$pgp_id_private}'/>\n\
                <input type='hidden' name='session_uid' value='{$session_uid}'/>\n\
                <input type='hidden' name='socket_host' value='{$socket_host}'/>\n\
            </form>\n\
        </article>";

    var socket_host = socket_url.split('/')[2];
    var split = idsigString.split(/\s+/g);
    if (split[0].toUpperCase() !== 'IDSIG')
        throw new Error("Invalid IDSIG: " + idsigString);

    var pgp_id_public = split[1];
    var session_uid = split[2];
    var username = split[3];
    var visibility = split[4];

    var status_content =
        "<label><strong>User ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='user'>" + username + "</span><br/></label>" +
        "<label><strong>PGP Key ID:&nbsp;&nbsp;&nbsp;</strong> <span class='pgp-id'>" + pgp_id_public + "</span><br/></label>" +
        "<label><strong>Session ID:&nbsp;&nbsp;&nbsp;</strong> <span class='session-uid'>" + session_uid + "</span><br/></label>" +
        "<label><strong>Visibility:&nbsp;&nbsp;&nbsp;</strong> <span class='visibility'>" + visibility + "</span><br/></label>" +
        "<div class='idsig' style='padding: 1em'>" + idsigString + "</div>";

    if (typeof PGPDB !== 'function')
        importScripts('pgp/pgp-db.js');

    var form_classes = [];
    var html_pgp_id_private_html = '';
    var auto_identify_host_attr = '';
    var auto_identify_all_attr = '';

    if (CONFIG) {
        //var autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
        //if (autoIdentify) {
        //    selectedPGPPrivateKeyID = autoIdentify;
        //    form_classes.push('auto-identify');
        //}
        if (CONFIG['autoIdentifyHost:' + socket_host])
            auto_identify_host_attr = "selected='selected'";
        else if (CONFIG['autoIdentify'])
            auto_identify_all_attr = "selected='selected'";
    }

    if (typeof PGPDB !== 'function')
        importScripts('pgp/pgp-db.js');

    PGPDB(function (db) {
        var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
        var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

        var index = privateKeyStore.index('id_public');
        var req = index.get(pgp_id_public);
        req.onsuccess = function (evt) {
            var privateKeyData = evt.target.result;
            if (!privateKeyData)
                throw new Error("Could not find private key: " + privateKeyID);
            var pgp_id_private = privateKeyData.id_private + "," + privateKeyData.id_public + "," + username + (privateKeyData.passphrase_required ? ',1' : ',0');

            // Callback
            callback(IDENTIFY_TEMPLATE_SUCCESS
                    .replace(/{\$form_class}/gi, form_classes.join(' '))
                    .replace(/{\$pgp_id_public}/gi, pgp_id_public)
                    .replace(/{\$pgp_id_private}/gi, pgp_id_private)
                    .replace(/{\$status_content}/gi, status_content || '')
                    .replace(/{\$id_signature}/gi, '')
                    .replace(/{\$socket_url}/gi, socket_url || '')
                    .replace(/{\$socket_host}/gi, socket_host || '')
                    .replace(/{\$session_uid}/gi, session_uid || '')
                    .replace(/{\$auto_identify_host_attr}/gi, auto_identify_host_attr || '')
                    .replace(/{\$auto_identify_all_attr}/gi, auto_identify_all_attr || '')
                    .replace(/{\$username}/gi, '') // username.replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_') || '')
            );
        };
    });
};
//var KEYGEN_CLOSED_TEMPLATE =
//    "<header><a href='#KEYGEN'>Generate a new PGP Key Pair</a></header>";

//<label class='label-visibility'>Who should be able to request your <br/><strong>Identification Signature</strong> while you're online?<br/>\n\
//    <select name='visibility'>\n\
//        <option value=':all'>Anyone (including anonymous users)</option>\n\
//        <option value=':identified'>Only other identified users</option>\n\
//        <option value=':none'>No one (Only username and key id)</option>\n\
//    </select>\n\
//<br/><br/></label>\n\
//<label class='label-content'>What content should be included along with your ID Signature?<br/>\n\
//    <select name='contents'>\n\
//        <option value=''>Just the Public Key and IDSIG (No profile information)</option>\n\
//        <option value='profile'>Public Key, IDSIG and Signed Profile</option>\n\
//    </select>\n\
//<br/><br/></label>\n\

//<label class='label-cache-time'>How long should your content (like feed posts) stay cached <br/>on the server after you disconnect from it?<br/>\n\
//    <select name='cache_time'>\n\
//        <option value='0'>Remove immediately</option>\n\
//        <option value='900'>Remove after 15 minute</option>\n\
//        <option value='21600'>Remove after 6 hour</option>\n\
//        <option value='86400'>Remove after 24 hours</option>\n\
//        <option value='max'>Keep on server as long as possible</option>\n\
//        <option onclick='clickPGPIdentityCustomCacheTime(event)' value='-1'>Custom Value</option>\n\
//    </select>\n\
//<br/><br/></label>\n\

/**
 * Created by ari on 6/19/2015.
 */


var templatePGPManageForm = function(status_content, callback) {

    // Template
    var MANAGE_TEMPLATE = "\
        <article class='pgp-manage:'>\n\
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
                <div class='pgp-manage-entries:'></div>\n\
                <label><strong>Action:&nbsp;&nbsp;</strong> <span class='action span-action'>No Keys Selected</span></label><br/>\n\
                <label><strong>Commands:</strong> \n\
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


var templatePGPManageFormEntry = function(privateKeyData, callback) {

    var MANAGE_TEMPLATE_ENTRY = "\
        <label>\n\
            <fieldset class='pgp-id-box pgp-id-box:{$id_private}{$class}'>\n\
                <legend class='title'>\n\
                    <input type='checkbox' value='{$id_private}' name='selected:{$id_private}'/> <span class='user'>{$user_id}</span>\n\
                </legend>\n\
                <strong>ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='fingerprint'>{$id_private_short}</span><br/>\n\
                <strong>Public ID:&nbsp;</strong> {$id_public_short}<br/>\n\
                <strong>User ID:&nbsp;&nbsp;&nbsp;</strong> <span class='user'>{$user_id}</span><br/>\n\
                <strong>Email:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='email'>{$user_email}</span><br/>\n\
                <strong>Passphrase:</strong> {$passphrase_required}<br/>\n\
                <strong>Is Default:</strong> {$is_default}<br/>\n\
            </fieldset>\n\
        </label>";

    // Callback
    callback(MANAGE_TEMPLATE_ENTRY
            .replace(/{\$id_private}/gi, privateKeyData.id_private)
            .replace(/{\$id_public}/gi, privateKeyData.id_public)
            .replace(/{\$id_private_short}/gi, privateKeyData.id_private.substr(privateKeyData.id_private.length - 8))
            .replace(/{\$id_public_short}/gi, privateKeyData.id_public.substr(privateKeyData.id_public.length - 8))
            .replace(/{\$block_private}/gi, privateKeyData.block_private)
            .replace(/{\$block_public}/gi, privateKeyData.block_public)
            .replace(/{\$user_id}/gi, privateKeyData.user_id.replace(/</, '&lt;'))
            .replace(/{\$user_name}/gi, privateKeyData.user_name || '')
            .replace(/{\$user_email}/gi, privateKeyData.user_email || '')
            .replace(/{\$user_comment}/gi, privateKeyData.user_comment || '')
            .replace(/{\$passphrase_required}/gi, privateKeyData.passphrase_required ? "Yes" : "No")
            .replace(/{\$is_default}/gi, privateKeyData.default === '1' ? "<strong>Yes</strong>" : "No")
            .replace(/{\$class}/gi, privateKeyData.default === '1' ? " pgp-id-box-default" : "")
            .replace(/{\$default}/gi, privateKeyData.default)
    );
};

var templatePGPKeyGenForm = function(user_id, send_as_socket_command, callback) {
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
                <input type='hidden' name='send_as_socket_command' value='{$send_as_socket_command}' />\n\
            </form>\n\
        </article>";

    // Callback
    callback(GENERATE_TEMPLATE
        .replace(/{\$user_id}/gi, user_id.replace(/</, '&lt;'))
        .replace(/{\$send_as_socket_command}/gi, send_as_socket_command ? '1' : '0')
    );
};


var templatePGPRegisterForm = function(private_key_block, status_content, callback) {

    var REGISTER_TEMPLATE = "\
            <article class='channel pgp:'>\n\
                <script src='pgp/pgp-listeners.js'></script>\n\
                <link rel='stylesheet' href='pgp/pgp.css' type='text/css'>\n\
                <legend class='title'><span class='command'>Register</span> a new PGP Key Pair</legend>\n\
                <div class='title-commands'>\n\
                    <a class='title-command-minimize' href='#MINIMIZE pgp:'>[-]</a><!--\
                     --><a class='title-command-maximize' href='#MAXIMIZE pgp:'>[+]</a><!--\
                     --><a class='title-command-close' href='#CLOSE pgp:'>[x]</a>\n\
                </div>\n\
                <form name='pgp-register-form' action='#' method='post' >\n\
                    <code class='status-box'>{$status_content}</code><br/>\n\
                    <label>Paste or <a href='#KEYGEN'>generate</a> a PGP Private key and <br/>enter it into the box below to register:<br/>\n\
                        <textarea name='private_key' required='required' placeholder='{$example_public_key}' rows='12' cols='68'>{$private_key_block}</textarea>\n\
                    </label>\n\
                    <br/><br/>Register:<br/>\n\
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

var templatePGPIdentifyForm = function(responseString, socket_url, CONFIG, callback) {

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

    if(typeof PGPDB !== 'function')
        importScripts('pgp/pgp-db.js');

    PGPDB.queryPrivateKeys(function(privateKeyData) {
        var defaultUsername = privateKeyData.user_name || privateKeyData.user_id;
        defaultUsername = defaultUsername.trim().split(/@/, 2)[0].replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_');
        var optionValue = privateKeyData.id_private + "," + privateKeyData.id_public + "," + defaultUsername + (privateKeyData.passphrase_required ? ',1' : ',0');

        if(privateKeyData.default) {
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
                if(privateKeyData.passphrase_required)
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
                //.replace(/{\$status_content}/gi, status_content || '')
                .replace(/{\$id_signature}/gi, '')
                .replace(/{\$socket_url}/gi, socket_url || '')
                .replace(/{\$socket_host}/gi, socket_host || '')
                .replace(/{\$html_pgp_id_private}/gi, html_pgp_id_private_html || '')
                .replace(/{\$session_uid}/gi, session_uid || '')
                .replace(/{\$auto_identify_host_attr}/gi, auto_identify_host_attr || '')
                .replace(/{\$auto_identify_all_attr}/gi, auto_identify_all_attr || '')
                .replace(/{\$username}/gi, '') // username.replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_') || '')
        );
    });

};


var templatePGPIdentifySuccessForm = function(idsigString, socket_url, CONFIG, callback) {

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

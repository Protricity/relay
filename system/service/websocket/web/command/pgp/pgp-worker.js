/**
 * Ari 7/2/2015.
 */
(function() {
    var CONFIG_ID = 'pgp';

    var PATH_PREFIX = 'pgp:';
    var PATH_MAIN = PATH_PREFIX + 'main';
    var PATH_ID_REQUEST = PATH_PREFIX + 'identify';

    var USE_SOCKET_PGP_KEYGEN = false;

    //var KEYGEN_CLOSED_TEMPLATE =
    //    "<header><a href='#KEYGEN'>Generate a new PGP Key Pair</a></header>";

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
        "<article class='{$attr_class}'>" +
            "<script src='command/pgp/pgp-listener.js'></script>" +
            "<link rel='stylesheet' href='command/pgp/pgp.css' type='text/css'>" +
            "<header><span class='command'>Generate</span> a new Identity</header>" +
            "{$html_header_commands}" +
            "<form name='pgp-keygen-form' action='#' method='post'>" +
                "<code class='status-box' style='display: none'></code><br/>" +
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
                "<input type='submit' value='Generate'  name='submit-generate' />" +
                " or <a href='#REGISTER'>Load your own PGP private key</a>" +

                "<input type='hidden' name='send_as_socket_command' value='{$send_as_socket_command}' />" +

            "</form>" +
        "</article>";

    var REGISTER_TEMPLATE =
        "<article class='{$attr_class}'>" +
            "<script src='command/pgp/pgp-listener.js'></script>" +
            "<link rel='stylesheet' href='command/pgp/pgp.css' type='text/css'>" +
            "<header><span class='command'>Register</span> a new PGP Key Pair</header>" +
            "{$html_header_commands}" +
            "<form name='pgp-register-form' action='#' method='post' >" +
                "<code class='status-box'>{$status_content}</code><br/>" +
                "<label>Paste or <a href='#KEYGEN'>generate</a> a PGP Private key and <br/>enter it into the box below to register:<br/>" +
                    "<textarea name='private_key' required='required' placeholder='" + EXAMPLE_PUBLIC_KEY + "' rows='12' cols='68'>{$private_key}</textarea>" +
                "</label>" +
                "<br/><br/>Register:<br/>" +
                "<input type='submit' name='submit-register' value='Register'/>" +
                " or <a href='#KEYGEN'>Generate a new PGP Key pair</a>" +
            "</form>" +
        "</article>";


    var IDENTIFY_TEMPLATE =
        "<article class='{$attr_class}'>" +
            "<script src='command/pgp/pgp-listener.js'></script>" +
            "<link rel='stylesheet' href='command/pgp/pgp.css' type='text/css'>" +
            "<header><span class='command'>Identify</span> yourself to the network</header>" +
            "{$html_header_commands}" +
            "<form class='{$form_class}' name='pgp-identify-form' action='#' method='post'>" +
                "<code class='status-box'>{$status_content}</code><br/>" +

                "<label class='label-pgp-id'>Identify using PGP Identity:<br/>" +
                    "<select name='pgp_id_private' required='required'>" +
                        "<option value=''>Select a PGP Identity</option>" +
                        "<optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>" +
                            "{$pgp_id_private_options}" +
                        "</optgroup>" +
                        "<optgroup label='Other options'>" +
                            "<option value='' disabled='disabled'>Manage PGP Identities...</option>" +
                            "<option value='' disabled='disabled'>Look up Identity...</option>" +
                        "</optgroup>" +
                    "</select>" +
                "<br/><br/></label>" +

                "<label class='label-passphrase show-on-passphrase-required'>PGP Passphrase (if required):<br/>" +
                    "<input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>" +
                "<br/><br/></label>" +


                "<label class='label-username hide-on-idsig-required'>Your <strong>Session Username</strong>:<br/>(how you appear to others while connected)<br/>" +
                    "<input type='text' name='username' required='required' placeholder='Enter a user name' value='{$username}'/>" +
                "<br/><br/></label>" +

                "<label class='hide-on-idsig-required'>" +
                    "<hr/>Submit Identification Signature:<br/>" +
                        //"<input type='button' name='submit-sign' value='Sign' />" +
                    "<input type='submit' name='submit-identify' value='Identify'/>" +

                    "<select name='auto_identify' class='show-on-succes' style='width:16em;'>" +
                        "<option value='ask'>Ask me every time</option>" +
                        "<option {$auto_identify_host_attr}value='auto-host'>Auto-Identify to {$socket_host} (passphrase may be required)</option>" +
                        "<option {$auto_identify_all_attr}value='auto-all'>Auto-Identify to all hosts (passphrase may be required)</option>" +
                    "</select>" +
                "<br/><br/></label>" +

                //"<label class='label-visibility'>Who should be able to request your <br/><strong>Identification Signature</strong> while you're online?<br/>" +
                //    "<select name='visibility'>" +
                //        "<option value=':all'>Anyone (including anonymous users)</option>" +
                //        "<option value=':identified'>Only other identified users</option>" +
                //        "<option value=':none'>No one (Only username and key id)</option>" +
                //    "</select>" +
                //"<br/><br/></label>" +

                "<label class='label-visibility hide-on-passphrase-required'>How should other users be allowed to interact<br/>with your client while connected?<br/>" +
                    "<select multiple='multiple' name='visibility' style='max-width:20em' size='6'>" +
                        "<optgroup label='Visibility Options'>" +
                            "<option selected='selected' value='M'>[MESSAGE] Accept private messages from other users</option>" +
                            "<option selected='selected' value='G'>[GET] Accept Content requests (like feed posts)</option>" +
                            "<option value='P'>[POST] Content Hosting with form submission (allow others to make HTTP POST requests to your client)</option>" +
                            "<option value='U'>[PUT] Content Hosting with content submission (allow others to post content your feed)</option>" +
                            "<option value='D'>[DELETE] Content Hosting with delete requests (allow others to delete content from your feed)</option>" +
                        "</optgroup>" +
                        "<optgroup label='Visibility Combos'>" +
                            "<option value='_'>[] No Visibility (No one can tell you're on a server until you join a channel)</option>" +
                            "<option value='_M'>[M] Accept private messages from other users (no one can see your feed)</option>" +
                            "<option value='_MG'>[MG] Accept Content requests (like feed posts) and private messages</option>" +
                            "<option value='_MGP'>[MGP] Content Hosting with form submission (allow others to post to your feed)</option>" +
                            "<option value='_MGPUD'>[MGPUD] Content Hosting with POST/PUT/DELETE requests (allow others to help manage your feed)</option>" +
                        "</optgroup>" +
                    "</select>" +
                "<br/><br/></label>" +

                //"<label class='label-content'>What content should be included along with your ID Signature?<br/>" +
                //    "<select name='contents'>" +
                //        "<option value=''>Just the Public Key and IDSIG (No profile information)</option>" +
                //        "<option value='profile'>Public Key, IDSIG and Signed Profile</option>" +
                //    "</select>" +
                //"<br/><br/></label>" +

                //"<label class='label-cache-time'>How long should your content (like feed posts) stay cached <br/>on the server after you disconnect from it?<br/>" +
                //    "<select name='cache_time'>" +
                //        "<option value='0'>Remove immediately</option>" +
                //        "<option value='900'>Remove after 15 minute</option>" +
                //        "<option value='21600'>Remove after 6 hour</option>" +
                //        "<option value='86400'>Remove after 24 hours</option>" +
                //        "<option value='max'>Keep on server as long as possible</option>" +
                //        "<option onclick='clickPGPIdentityCustomCacheTime(event)' value='-1'>Custom Value</option>" +
                //    "</select>" +
                //"<br/><br/></label>" +

                "<label class='hide-on-idsig-required'><hr/>This is your <strong>Identification Signature</strong> for this session<br/>(What others see when they request your <i>IDSIG</i>):<br/>" +
                    "<textarea disabled='disabled' name='id_signature' rows='6' cols='68'>{$id_signature}</textarea>" +
                "<br/></label>" +

                "<input type='hidden' name='session_uid' value='{$session_uid}'/>" +
                "<input type='hidden' name='socket_host' value='{$socket_host}'/>" +

            "</form>" +
        "</article>";

    var IDENTIFY_TEMPLATE_SUCCESS =
        "<article class='{$attr_class}'>" +
            "<script src='command/pgp/pgp-listener.js'></script>" +
            "<link rel='stylesheet' href='command/pgp/pgp.css' type='text/css'>" +
            "<header><span class='command'>IDSIG</span> Successful</header>" +
            "{$html_header_commands}" +
            "<form name='pgp-identify-success-form' action='#CLOSE {$channel_class}' onsubmit=''>" +
                "<code class='status-box'>{$status_content}</code><br/>" +

                "Options for next time:<hr/>" +

                "<button type='submit' name='submit-close'>" +
                    "<a class='header-command-close' href='#CLOSE {$channel_class}'>Close</a>" +
                "</button>" +
                "<select name='auto_identify' style='width:16em;'>" +
                    "<option value='ask'>Ask me every time</option>" +
                    "<option {$auto_identify_host_attr}value='auto-host'>Auto-Identify to {$socket_host} (passphrase may be required)</option>" +
                    "<option {$auto_identify_all_attr}value='auto-all'>Auto-Identify to all hosts (passphrase may be required)</option>" +
                "</select>" +

                "<input type='hidden' name='pgp_id_public' value='{$pgp_id_public}'/>" +
                "<input type='hidden' name='session_uid' value='{$session_uid}'/>" +
                "<input type='hidden' name='socket_host' value='{$socket_host}'/>" +

            "</form>" +
        "</article>";

    var MANAGE_TEMPLATE =
        "<article class='{$attr_class}'>" +
            "<script src='command/pgp/pgp-listener.js'></script>" +
            "<link rel='stylesheet' href='command/pgp/pgp.css' type='text/css'>" +
            "<header><span class='command'>Manage</span> PGP Identities</header>" +
            "{$html_header_commands}" +
            "<form name='pgp-manage-form' action='#'>" +
                "<code class='status-box'>{$status_content}</code>" +

                "<div class='pgp-id-box-container channel-content'></div>" +

                "<label><strong>Action:&nbsp;&nbsp;</strong> <span class='action span-action'>No Keys Selected</span></label><br/>" +
                "<label><strong>Commands:</strong> " +
                    "<select name='action'>" +
                        "<option value=''>Select action</option>" +
                        "<option value='default {$id_private_list}'>Make Default Identity</option>" +
                        "<option value='@passphrase {$id_private}'>Change Password</option>" +
                        "<option value='sign {$id_private_list}'>Sign Message</option>" +
                        "<option value='verify {$id_private_list}'>Verify Message</option>" +
                        "<option value='encrypt {$id_private_list}'>Encrypt Message</option>" +
                        "<option value='decrypt {$id_private_list}'>Decrypt Message</option>" +
                        "<option value='@export.public {$id_private}'>Export Public Key Block</option>" +
                        "<option value='@export.private {$id_private}'>Export Private Key Block</option>" +
                        "<option value='@unregister {$id_private}'>Unregister Private Key Identity</option>" +
                        "<option value='keygen'>Generate a new Identity</option>" +
                    "</select>" +
                "</label><br/>" +
                "<label><strong>Submit:&nbsp;&nbsp;</strong> <input type='submit' /><br/>" +
            "</form>" +
        "</article>";

    var MANAGE_TEMPLATE_ENTRY =
        "<label>" +
            "<fieldset class='pgp-id-box pgp-id-box:{$id_private}{$class}'>" +
                "<legend>" +
                    "<input type='checkbox' value='{$id_private}' name='selected:{$id_private}'/> <span class='user'>{$user_id}</span>" +
                "</legend>" +
                "{$html_header_commands}" +
                "<strong>ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='fingerprint'>{$id_private_short}</span><br/>" +
                "<strong>Public ID:&nbsp;</strong> {$id_public_short}<br/>" +
                "<strong>User ID:&nbsp;&nbsp;&nbsp;</strong> <span class='user'>{$user_id}</span><br/>" +
                "<strong>Email:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='email'>{$user_email}</span><br/>" +
                "<strong>Passphrase:</strong> {$passphrase_required}<br/>" +
                "<strong>Is Default:</strong> {$is_default}<br/>" +
            "</fieldset>" +
        "</label>";


    /**
     * @param commandString
     * @param status_content
     */
    socketCommands.manage = function (commandString, e, status_content) {
        //var match = /^manage$/im.exec(commandString);

        self.routeResponseToClient("LOG.REPLACE " + PATH_MAIN + " * " + MANAGE_TEMPLATE
                .replace(/{\$status_content}/gi, status_content || '')
            //.replace(/{\$[^}]+}/gi, '')
        );

        var PGPDB = getPGPDB();
        PGPDB.queryPrivateKeys(function(data) {
            self.routeResponseToClient("LOG " + PATH_MAIN + " .channel-content " + MANAGE_TEMPLATE_ENTRY
                    .replace(/{\$id_private}/gi, data.id_private)
                    .replace(/{\$id_public}/gi, data.id_public)
                    .replace(/{\$id_private_short}/gi, data.id_private.substr(data.id_private.length - 8))
                    .replace(/{\$id_public_short}/gi, data.id_public.substr(data.id_public.length - 8))
                    .replace(/{\$block_private}/gi, data.block_private)
                    .replace(/{\$block_public}/gi, data.block_public)
                    .replace(/{\$user_id}/gi, data.user_id.replace(/</, '&lt;'))
                    .replace(/{\$user_name}/gi, data.user_name || '')
                    .replace(/{\$user_email}/gi, data.user_email || '')
                    .replace(/{\$user_comment}/gi, data.user_comment || '')
                    .replace(/{\$passphrase_required}/gi, data.passphrase_required ? "Yes" : "No")
                    .replace(/{\$is_default}/gi, data.default === '1' ? "<strong>Yes</strong>" : "No")
                    .replace(/{\$class}/gi, data.default === '1' ? " pgp-id-box-default" : "")
                    .replace(/{\$default}/gi, data.default)
                //.replace(/{\$[^}]+}/gi, '')
            );
        });

    };

    socketResponses.manage = function(e) {
        throw new Error("manage response is not implemented");
    };




    /**
     * @param commandString KEYGEN --bits [2048] [user id]
     */
    socketCommands.keygen = function (commandString, e) {
        var match = /^keygen ?(.+)?$/im.exec(commandString);
        if(!match)
            throw new Error("Invalid command: " + commandString);

        var content = match[1] || '';
        var bits = 2048;
        content = content.replace(/--bits (\d+)/i, function(match, contents, offset, s) {
            bits = parseInt(contents); return '';
        });

        var passphrase = null;
        content = content.replace(/--pass(?:phrase)? ([^-]+)/i, function(match, contents, offset, s) {
            passphrase = contents.trim(); return '';
        });

        var userID = content.trim();
        content.replace(/--user ([^-]+)/i, function(match, contents, offset, s) {
            userID = contents; return '';
        });

        var kbpgp = getKBPGP();
        var send_as_socket_command = USE_SOCKET_PGP_KEYGEN;
        if(send_as_socket_command && typeof crypto === 'undefined' || crypto.polyfill === true) {
            console.warn("Crypto is undefined within the WebWorker. Falling back to client-side cryptography");
            send_as_socket_command = false;
        }

        if(!userID || !send_as_socket_command) {
            self.routeResponseToClient("LOG.REPLACE " + PATH_MAIN + " * " + GENERATE_TEMPLATE
                    .replace(/{\$user_id}/gi, userID.replace(/</, '&lt;'))
                    .replace(/{\$send_as_socket_command}/gi, send_as_socket_command ? '1' : '0')
                    //.replace(/{\$[^}]+}/gi, '')
            );
            return;
        }

        var F = kbpgp["const"].openpgp;

        var opts = {
            userid: userID,
            primary: {
                nbits: bits,
                flags: F.certify_keys | F.sign_data | F.auth | F.encrypt_comm | F.encrypt_storage,
                expire_in: 0  // never expire
            },
            subkeys: [
                {
                    nbits: bits/2,
                    flags: F.sign_data,
                    expire_in: 86400 * 365 * 8 // 8 years
                }, {
                    nbits: bits/2,
                    flags: F.encrypt_comm | F.encrypt_storage,
                    expire_in: 86400 * 365 * 8
                }
            ]
        };

        kbpgp.KeyManager.generate(opts, function(err, alice) {
            if (!err) {
                // sign alice's subkeys
                alice.sign({}, function(err) {
                    console.log(alice);
                    // export demo; dump the private with a passphrase
                    
                    alice.armored_pgp_private = null;
                    alice.export_pgp_private ({
                        passphrase: passphrase
                    }, function(err, pgp_private) {
                        console.log("private key: ", err, pgp_private);

                        self.routeResponseToClient("LOG.REPLACE " + PATH_MAIN + " * " + REGISTER_TEMPLATE
                            .replace(/{\$status_content}/gi, '')
                            .replace(/{\$private_key}/gi, pgp_private)
                                //.replace(/{\$[^}]+}/gi, '')
                        );

                    });

                    alice.armored_pgp_public = null;
                    alice.export_pgp_public({}, function(err, pgp_public) {
                        console.log("public key: ", pgp_public);


                    });
                });
            }
        });
    };

    socketResponses.keygen = function(responseString, e) {
        throw new Error("keygen response is not implemented");
    };

    /**
     * @param commandString REGISTER
     */
    socketCommands.register = function (commandString, e) {
        var privateKeyBlock = '';
        var status_content = '';
        var match = /^register\s*([\s\S]*)$/im.exec(commandString);
        if(match && match[1])
            privateKeyBlock = match[1].replace(/(\r\n|\r|\n)/g, '\r\n');

        var showForm = false;
        if(!privateKeyBlock) {
            showForm = true;

        } else {
            privateKeyBlock = privateKeyBlock.replace(/--show-form\s*/i, function (match, contents, offset, s) {
                showForm = true; return '';
            });
        }

        if(showForm) {
            if(privateKeyBlock) {
                var kbpgp = getKBPGP();

                kbpgp.KeyManager.import_from_armored_pgp({
                    armored: privateKeyBlock
                }, function(err, alice) {
                    if (err)
                        throw new Error(err);

                    var privateKey = alice.find_crypt_pgp_key();
                    var privateKeyFingerprint = privateKey.get_fingerprint().toString('hex').toUpperCase();
                    var publicKey = alice.find_signing_pgp_key();
                    var publicKeyFingerprint = publicKey.get_fingerprint().toString('hex').toUpperCase();
                    var userID = alice.userids[0];
                    var userIDString = "" + userID.get_username()
                        + (userID.get_comment() ? ' ' + userID.get_comment() : '')
                        + (userID.get_email() ? " <" + userID.get_email() + ">" : '');

                    status_content =
                        "Ready to <span class='command'>register</span> new PGP Identity:<br/>\n" +
                        "User ID: " + userIDString + "<br/>\n" +
                        "Private Key ID: " + privateKeyFingerprint + "<br/>\n" +
                        "Public Key ID:  " + publicKeyFingerprint + "<br/>\n";

                    self.routeResponseToClient("LOG.REPLACE " + PATH_MAIN + " * " + REGISTER_TEMPLATE
                            .replace(/{\$status_content}/gi, status_content)
                            .replace(/{\$private_key}/gi, privateKeyBlock)
                    );
                });

            } else {
                status_content = "<span class='info'>Paste a new PGP PRIVATE KEY BLOCK to register a new PGP Identity manually</span>";
                self.routeResponseToClient("LOG.REPLACE " + PATH_MAIN + " * " + REGISTER_TEMPLATE
                    .replace(/{\$status_content}/gi, status_content)
                    .replace(/{\$private_key}/gi, privateKeyBlock)
                );
            }
        } else {

            var PGPDB = getPGPDB();
            PGPDB.addPrivateKeyBlock(privateKeyBlock, function(err, data) {
                console.log(data);
                if(err) {
                    self.routeResponseToClient("LOG.REPLACE " + PATH_MAIN + " * " + REGISTER_TEMPLATE
                            .replace(/{\$status_content}/gi, err)
                            .replace(/{\$private_key}/gi, privateKeyBlock)
                            //.replace(/{\$[^}]+}/gi, '')
                    );
                } else {
                    socketCommands.manage("MANAGE");

                }
            });
        }

    };

    socketResponses.register = function(responseString, e) {
        throw new Error("register response is not implemented");
    };

    /**
     * @param commandString UNREGISTER [PGP Private Key Fingerprint]
     */
    socketCommands.unregister = function (commandString) {
        var match = /^unregister\s+(.*)$/im.exec(commandString);
        var privateKeyFingerprints = match[1].trim().split(/\W+/g);
        for(var i=0; i<privateKeyFingerprints.length; i++)
            (function(privateKeyFingerprint) {
                var privateKeyID = privateKeyFingerprint.substr(privateKeyFingerprint.length - 16);

                var PGPDB = getPGPDB();
                PGPDB(function (db) {
                    var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
                    var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

                    var insertRequest = privateKeyStore.delete(privateKeyID);
                    insertRequest.onsuccess = function(e) {
                        var status_content = "Deleted private key block from database: " + privateKeyID;
                        console.log(status_content);
                        socketCommands.manage("MANAGE", e, status_content);

                    };
                    insertRequest.onerror = function(e) {
                        var err = e.currentTarget.error;
                        var status_content = "Error adding private key (" + privateKeyID + ") database: " + err.message;
                        console.error(status_content, e);
                        socketCommands.manage("MANAGE", e, status_content);

                    };
                });
            }) (privateKeyFingerprints[i]);
    };


    socketResponses.unregister = function(responseString, e) {
        throw new Error("unregister response is not implemented");
    };



    /**
     * @param commandString DEFAULT [PGP Private Key Fingerprint]
     */
    socketCommands['default'] = function (commandString, e) {
        var match = /^default\s+(.*)$/im.exec(commandString);
        var privateKeyFingerprint = match[1].trim().split(/\W+/g)[0];
        var privateKeyID = privateKeyFingerprint.substr(privateKeyFingerprint.length - 16);

        var PGPDB = getPGPDB();
        PGPDB(function (db) {
            var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
            var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

            var req = privateKeyStore.get(privateKeyID);
            req.onsuccess = function (evt) {
                var privateKeyData = evt.target.result;
                if(!privateKeyData)
                    throw new Error("Could not find private key: " + privateKeyID);

                var index = privateKeyStore.index('default');
                var getRequest = index.get('1');
                getRequest.onsuccess = function (evt) {
                    var oldDefaultPrivateKeyData = evt.target.result;

                    if(oldDefaultPrivateKeyData) {
                        console.log("Resetting Default PK: ", oldDefaultPrivateKeyData);
                        oldDefaultPrivateKeyData.default = '0';
                        privateKeyStore.put(oldDefaultPrivateKeyData);
                    }

                    privateKeyData.default = '1';
                    var updateRequest = privateKeyStore.put(privateKeyData);
                    updateRequest.onsuccess = function(event) {
                        socketCommands.manage("MANAGE", e, "Private Key ID set to default: " + privateKeyFingerprint);
                    };
                };
            };
        });
    };

    socketResponses['default'] = function(responseString, e) {
        throw new Error("default response is not implemented");
    };



    var identifyRequests = [];
    /**
     * @param commandData IDENTIFY --session [session-uid] --id [pgp-key-id] --username [username] --visibility [visibility] --auto-identify [0,1]
     */
    socketCommands.identify = function (commandData, e) {
        var ConfigDB = getConfigDB();
        ConfigDB.getConfig(CONFIG_ID, function(err, CONFIG) {
            if(err)
                throw new Error(err);

            if(typeof commandData === 'string')
                commandData = {message: commandData, passphrase: null};
            var commandString = commandData.message;

            if(identifyRequests.length === 0) {
                throw new Error("No IDENTIFY REQUESTS received");
            }
            var identifyRequest = identifyRequests[0];
            var responseString = identifyRequest[0];
            var socket = identifyRequest[1];
            var socket_host = socket.url.split('/')[2];

            var match = /^identify\s?([\s\S]*)$/im
                .exec(commandString);
            if(!match)
                throw new Error("Could not match identify command");
            var identifyContent = match[1] || '';

            var session_uid = null; // match[1];
            var selectedPrivateKeyID = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || null; // match[2];
            var selectedPrivateKeyData = null; // null;
            var username = ''; // match[3];
            var visibility = null; // match[4];
            var auto_identify = null; // match[4];

            identifyContent = identifyContent.replace(/--session (\S+)/i, function(match, contents, offset, s) {
                session_uid = contents; return '';
            });
            identifyContent = identifyContent.replace(/--id (\S+)/i, function(match, contents, offset, s) {
                selectedPrivateKeyID = contents; return '';
            });
            identifyContent = identifyContent.replace(/--username (\S+)/i, function(match, contents, offset, s) {
                username = contents; return '';
            });
            identifyContent = identifyContent.replace(/--visibility (\S+)/i, function(match, contents, offset, s) {
                visibility = contents; return '';
            });
            identifyContent = identifyContent.replace(/(?:-y|--auto-identify) (\S+)/i, function(match, contents, offset, s) {
                auto_identify = contents ? true : false; return '';
            });


            var PGPDB = getPGPDB();
            var pgp_id_private_options_html = '';
            //var id_signature = null;
            var pgpIDCount = 0;
            var form_classes = ['idsig-required'];
            var status_content = '';

            PGPDB.queryPrivateKeys(function(privateKeyData) {
                pgpIDCount++;

                if(privateKeyData.default === '1')
                    if(!selectedPrivateKeyID)
                        selectedPrivateKeyID = privateKeyData.id_private;

                var defaultUsername = privateKeyData.user_name || privateKeyData.user_id;
                defaultUsername = defaultUsername.trim().split(/@/, 2)[0].replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_');

                if(privateKeyData.id_private === selectedPrivateKeyID) {
                    selectedPrivateKeyData = privateKeyData;
                    if(!username)
                        username = defaultUsername;

                }

                pgp_id_private_options_html +=
                    '<option ' + (privateKeyData.id_private === selectedPrivateKeyID ? 'selected="selected"' : '') +
                    ' value="' + privateKeyData.id_private + "," + privateKeyData.id_public + "," + defaultUsername + (privateKeyData.passphrase_required ? ',1' : ',0') +
                    '">' +
                        (privateKeyData.passphrase_required ? '(*) ' : '') + privateKeyData.user_id.replace(/</, '&lt;') +
                    '</option>';



            }, function() {

                match = /^identify\s+(\S*)/im.exec(responseString);
                if(!match)
                    throw new Error("Invalid IDENTIFY: " + responseString);
                var session_uid = match[1];

                var status_content = "<span class='info'>IDENTIFY request received from</br>[" + socket.url + "]</span>";

                if(pgpIDCount === 0)
                    status_content += "<br/><span class='error'>No PGP Private Keys found on the client. Please import or <a href='#KEYGEN' onclick='send(\"KEYGEN\");'>generate</a> a new PGP Key and re-<a href='#IDENTIFY' onclick='send(\"IDENTIFY\");'>identify</a>.</span>";


                var signedIdentityString = '';
                var auto_identify_host_attr = '';
                var auto_identify_all_attr = '';

                if(!selectedPrivateKeyData.passphrase_required) {
                    if(CONFIG) {
                        var autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
                        if (autoIdentify)
                            form_classes.push('auto-identify');
                        if (CONFIG['autoIdentifyHost:' + socket_host])
                            auto_identify_host_attr = "selected='selected'";
                        else if (CONFIG['autoIdentify'])
                            auto_identify_all_attr = "selected='selected'";
                    }

                } else {
                    if(selectedPrivateKeyData.passphrase_required)
                        form_classes.push('passphrase-required');
                }

                self.routeResponseToClient("LOG.REPLACE " + PATH_ID_REQUEST + " * " + IDENTIFY_TEMPLATE
                    .replace(/{\$form_class}/gi, form_classes.join(' '))
//                                 .replace(/{\$id_private_short}/gi, data.id_private.substr(data.id_private.length - 8))
                    .replace(/{\$pgp_id_private}/gi, selectedPrivateKeyID)
                    .replace(/{\$pgp_id_private_short}/gi, selectedPrivateKeyID ? selectedPrivateKeyID.substr(selectedPrivateKeyID.length - 8) : '')
                    .replace(/{\$status_content}/gi, status_content || '')
                    .replace(/{\$id_signature}/gi, signedIdentityString || '')
                    .replace(/{\$socket_url}/gi, socket.url || '')
                    .replace(/{\$socket_host}/gi, socket.url.split('/')[2] || '')
                    .replace(/{\$pgp_id_private_options}/gi, pgp_id_private_options_html || '')
                    .replace(/{\$session_uid}/gi, session_uid || '')
                    .replace(/{\$auto_identify_host_attr}/gi, auto_identify_host_attr || '')
                    .replace(/{\$auto_identify_all_attr}/gi, auto_identify_all_attr || '')
                    .replace(/{\$username}/gi, username.replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_') || '')
                    //.replace(/{\$[^}]+}/gi, '')
                );

            });
        });

    };



    /**
     * @param responseString [challenge_string] [session_id]
     */
    socketResponses.identify = function (responseString, e) {
        var socket = e.target;
        identifyRequests.push([responseString, socket]);
        socketCommands.identify("IDENTIFY", e);

        //ConfigDB.getConfig(CONFIG_ID, function(CONFIG) {
        //    var socket_host = socket.url.split('/')[2];
            //var autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
        //});
    };

    /**
     * @param commandData IDSIG [idsig and public key content]
     */
    socketCommands.idsig = function (commandData, e) {
        if(typeof commandData === 'string')
            commandData = {message: commandData, passphrase: null};
        var commandString = commandData.message;

        if(identifyRequests.length === 0)
            throw new Error("No IDENTIFY REQUESTS received");

        var match = /^idsig\s?([\s\S]*)$/im
            .exec(commandString);
        if(!match)
            throw new Error("Could not match idsig content");
        var identifyContent = match[1] || '';

        match = /IDSIG\s+(\S+)\s+(\S+)/i.exec(identifyContent);
        if(!match || !match[1] || !match[2])
            throw new Error("Could not find challenge string");

        //var selectedPGPKeyID = match[1];
        var session_uid = match[2];

        var foundRequest = null;
        for (var j = 0; j < identifyRequests.length; j++) (function(identifyRequest) {
            if (identifyRequest[0].indexOf("IDENTIFY " + session_uid) !== -1) {
                foundRequest = identifyRequest;
            }
        })(identifyRequests[j]);

        if(!foundRequest)
            throw new Error("Could not find IDENTITY request: " + session_uid);

        var sendSocket = foundRequest[1];
        self.sendWithSocket(sendSocket, commandString);
        //sendSocket.send(commandString); // TODO: socket out
        //console.log("SOCKET OUT (" + sendSocket.url + "): " + commandString);

    };


    /**
     * @param commandData IDSIG [challenge-string] [session-id] [pgp-key-id] [username] [visibility]
     */
    socketResponses.idsig = function (commandData, e) {
        var split = commandData.split(/\s+/g);
        if(split[0].toUpperCase() !== 'IDSIG')
            throw new Error("Invalid IDSIG: " + commandData);

        var pgp_id_public = split[1];
        var session_uid = split[2];
        var username = split[3];
        var visibility = split[4];

        var status_content =
            "<label><strong>User ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='user'>" + username + "</span><br/></label>" +
            "<label><strong>PGP Key ID:&nbsp;&nbsp;&nbsp;</strong> <span class='pgp-id'>" + pgp_id_public + "</span><br/></label>" +
            "<label><strong>Session ID:&nbsp;&nbsp;&nbsp;</strong> <span class='session-uid'>" + session_uid + "</span><br/></label>" +
            "<label><strong>Visibility:&nbsp;&nbsp;&nbsp;</strong> <span class='visibility'>" + visibility + "</span><br/></label>" +
            "<div class='idsig' style='padding: 1em'>" + commandData + "</div>";

        var ConfigDB = getConfigDB();
        ConfigDB.getConfig(CONFIG_ID, function(err, CONFIG) {
            if(err)
                throw new Error(err);

            for (var j = 0; j < identifyRequests.length; j++) (function(identifyRequest) {
                if (identifyRequest[0].indexOf("IDENTIFY " + session_uid) !== -1) {
                    var socket = identifyRequest[1];
                    var socket_host = socket.url.split('/')[2];

                    var auto_identify_host_attr = '';
                    var auto_identify_all_attr = '';
                    var autoIdentify = false;
                    if(CONFIG) {
                        autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
                        if(CONFIG['autoIdentifyHost:' + socket_host])
                            auto_identify_host_attr = "selected='selected'";
                        else if(CONFIG['autoIdentify'])
                            auto_identify_all_attr = "selected='selected'";
                    }

                    self.routeResponseToClient("LOG.REPLACE " + PATH_ID_REQUEST + " * " + IDENTIFY_TEMPLATE_SUCCESS
                            .replace(/{\$pgp_id_public}/gi, pgp_id_public)
                            .replace(/{\$status_content}/gi, status_content || '')
                            .replace(/{\$socket_url}/gi, socket.url || '')
                            .replace(/{\$socket_host}/gi, socket.url.split('/')[2] || '')
                            .replace(/{\#session_uid}/gi, session_uid || '')
                            .replace(/{\$auto_identify_host_attr}/gi, auto_identify_host_attr || '')
                            .replace(/{\$auto_identify_all_attr}/gi, auto_identify_all_attr || '')
                            //.replace(/{\$[^}]+}/gi, '')
                    );

                    console.info("Removing IDENTIFY request: ", identifyRequest);
                    identifyRequests.splice(j, 1);
                    j--;
                }
            })(identifyRequests[j]);


            getPGPDB(function(db) {
               PGPDB.addIDSIGToDatabase(commandData, function(err, sessionData) {
                    if(err)
                        throw new Error(err);

               }) ;
            });
        });
    };

    //
    //
    //
    //function signWithPrivateKey(contentToSign, privateKeyBlock, passphrase, callback) {
    //
    //    var kbpgp = getKBPGP();
    //
    //    kbpgp.KeyManager.import_from_armored_pgp({
    //        armored: privateKeyBlock
    //    }, function(err, alice) {
    //        var params = {
    //            msg:        contentToSign,
    //            sign_with:  alice
    //        };
    //        if (!err) {
    //            if (alice.is_pgp_locked()) {
    //                alice.unlock_pgp({
    //                    passphrase: passphrase
    //                }, function(err) {
    //                    if (!err) {
    //                        console.log("Loaded private key with passphrase");
    //                        kbpgp.box (params, function(err, result_string, result_buffer) {
    //                            callback(err, result_string);
    //                        });
    //
    //                    } else {
    //                        callback(err, null);
    //                    }
    //                });
    //            } else {
    //                console.log("Loaded private key w/o passphrase");
    //                kbpgp.box (params, function(err, result_string, result_buffer) {
    //                    callback(err, result_string);
    //                });
    //            }
    //        } else {
    //            callback(err, null);
    //        }
    //    });
    //
    //}

    var pgpConfig = {};

    function onNewSocket(newSocket) {
        console.log("New Socket", newSocket);
        // type as guest until identify. most functionality won't work without identifying


    }


    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

    function getKBPGP() {
        if(typeof self.kbpgp !== 'undefined')
            return self.kbpgp;
        if(typeof self.crypto === 'undefined') {
            importScripts('pgp/lib/support/nfcrypto.js');
            self.crypto = self.nfCrypto;
            console.log(self.crypto);
        }
        importScripts('pgp/lib/kbpgp/kbpgp.js');
        console.log("Loaded: ", self.kbpgp);
        return self.kbpgp;
    }



    // Database

    function getPGPDB(callback) {
        if(typeof PGPDB !== 'function')
            importScripts('pgp/pgp-db.js');

        if(callback)
            PGPDB(callback);

        return PGPDB;
    }

    function getConfigDB(callback) {
        if(typeof ConfigDB !== 'function')
            importScripts('config/config-db.js');

        if(callback)
            ConfigDB(callback);
        return ConfigDB;
    }

})();

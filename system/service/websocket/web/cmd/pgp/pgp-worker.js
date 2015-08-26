/**
 * Ari 7/2/2015.
 */
(function() {


    var PATH_PREFIX = 'pgp:';
    var PATH_MAIN = PATH_PREFIX + 'main';
    var PATH_ID_REQUEST = PATH_PREFIX + 'identify';

    var USE_SOCKET_PGP_KEYGEN = false;

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
        "<form name='pgp-keygen-form' action='#' method='post' onsubmit='return submitPGPKeyGenForm(event);'>" +
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
            "<input type='submit' value='Generate'  name='submit-generate' />" +
            " or <a href='#REGISTER'>Load your own PGP private key</a>" +
            
            "<input type='hidden' name='send_as_socket_command' value='{$send_as_socket_command}' />" +

        "</form>";

    var REGISTER_TEMPLATE =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Register a new PGP Key Pair</legend>" +
        "<form name='pgp-register-form' action='#' method='post' onsubmit='return submitPGPRegisterForm(event);'>" +
            "<div class='status-box'>{$status_content}</div>" +
            "<label>Paste or <a href='#KEYGEN'>generate</a> a PGP Private key and <br/>enter it into the box below to register:<br/>" +
                "<textarea onchange='changePGPRegisterForm(event);' name='private_key' required='required' placeholder='" + EXAMPLE_PUBLIC_KEY + "' rows='12' cols='68'>{$private_key}</textarea>" +
            "</label>" +
            "<br/><br/>Register:<br/>" +
            "<input type='submit' name='submit-register' value='Register'/>" +
            " or <a href='#KEYGEN'>Generate a new PGP Key pair</a>" +
        "</form>";

    var REGISTER_TEMPLATE_COMPLETE =
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Registration Successful</legend>" +
        "<div class='status-box'>{$status_content}</div>" +
        "<a href='#HIDE'>Close Window</a>";


    var IDENTIFY_TEMPLATE =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Identify yourself to the network [{$socket_host}]</legend>" +
        "<form name='pgp-identify-form' action='#' method='post' onsubmit='return submitPGPIdentifyForm(event);'>" +
            "<div class='status-box'>{$status_content}</div>" +

            "<label class='label-pgp-id'>Identify using PGP Identity:<br/>" +
                "<select name='pgp_id' required='required' onfocus='focusPGPIdentifyForm(event)' onselect='focusPGPIdentifyForm(event)' oninput='focusPGPIdentifyForm(event)'>" +
                    "<optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>" +
                        "{$pgp_id_options}" +
                    "</optgroup>" +
                    "<optgroup label='Other options'>" +
                        "<option value=''>Manage PGP Identities...</option>" +
                    "</optgroup>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-passphrase' oninput='focusPGPIdentifyForm(event)' style='{$password_style}'>PGP Passphrase (if required):<br/>" +
                "<input type='password' name='passphrase' required='{$password_required}' placeholder='Enter your PGP Passphrase'/>" +
            "<br/><br/></label>" +


            "<label class='label-username' oninput='focusPGPIdentifyForm(event)'>Your <strong>Session Username</strong>:<br/>(how you appear to others while connected)<br/>" +
                "<input type='text' name='username' required='required' placeholder='Enter a user name' value='{$username}'/>" +
            "<br/><br/></label>" +

            //"<label class='label-visibility'>Who should be able to request your <br/><strong>Identification Signature</strong> while you're online?<br/>" +
            //    "<select name='visibility'>" +
            //        "<option value=':all'>Anyone (including anonymous users)</option>" +
            //        "<option value=':identified'>Only other identified users</option>" +
            //        "<option value=':none'>No one (Only username and key id)</option>" +
            //    "</select>" +
            //"<br/><br/></label>" +

            "<label class='label-visibility'>How should other users be allowed to interact<br/>with your client while connected?<br/>" +
                "<select multiple='multiple' name='visibility' style='max-width:20em' size='6'  onselect='focusPGPIdentifyForm(event)' oninput='focusPGPIdentifyForm(event)'>" +
                    "<optgroup label='Visibility Options'>" +
                        "<option selected='selected' value='M'>[MESSAGE] Accept private messages from other users</option>" +
                        "<option selected='selected' value='G'>[GET] Accept Content requests (like feed posts)</option>" +
                        "<option value='P'>[POST] Content Hosting with form submission (allow others to post to your feed)</option>" +
                        "<option value='D'>[DELETE] Content Hosting with delete requests (allow others to help manage your feed)</option>" +
                    "</optgroup>" +
                    "<optgroup label='Visibility Combos'>" +
                        "<option value='_'>[] No Visibility (No one can tell you're on a server until you join a channel)</option>" +
                        "<option value='_M'>[M] Accept private messages from other users (no one can see your feed)</option>" +
                        "<option value='_MG'>[MG] Accept Content requests (like feed posts) and private messages</option>" +
                        "<option value='_MGP'>[MGP] Content Hosting with form submission (allow others to post to your feed)</option>" +
                        "<option value='_MGPD'>[MGPD] Content Hosting with delete requests (allow others to help manage your feed)</option>" +
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

            "<div class='submit-section'>" +
                "<label>This is your <strong>Identification Signature</strong> for this session<br/>(What others see when they request your <i>IDSIG</i>):<br/>" +
                    "<textarea class='pgp-idsig-required'  required='required' name='id_signature' required='required' rows='12' cols='68'>{$id_signature}</textarea>" +
                "<br/></label>" +

                "<hr/>Submit Identification Signature:<br/>" +
                //"<input type='button' name='submit-sign' value='Sign' onclick='focusPGPIdentifyForm(event)'/>" +
                "<input type='submit' name='submit-identify' value='Identify'/>" +

                "<label>" +
                    "<input type='checkbox' name='auto_identify' value='1' {$auto_identify_checked_attr}/>" +
                    "Auto-Identify" +
                "</label>" +

                "<input type='hidden' name='session_uid' value='{$session_uid}'/>" +
            "</div>" +

        "</form>";

    var IDENTIFY_TEMPLATE_SUCCESS =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>IDSIG Successful to [{$socket_host}]</legend>" +
        "<form name='pgp-identify-success-form' action='#' method='post'>" +
        "<div class='status-box'>{$status_content}</div>" +

            "<input type='submit' name='submit-close' value='Close'/>" +

            "<hr/>Options for next time:<br/>" +
            "<label>" +
                "<input type='checkbox' name='auto_identify' value='1' {$auto_identify_checked_attr}/>" +
                "Auto-Identify to {$socket_host}" +
            "</label>" +

            "<input type='hidden' name='session_uid' value='{$session_uid}'/>" +
        "</div>" +

        "</form>";


    var MANAGE_TEMPLATE =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Manage PGP Identities</legend>" +
        "<form name='pgp-manage-form' action='#' onsubmit='return submitPGPManageForm(event);'>" +
            "<div class='status-box'>{$status_content}</div>" +
            "<div class='pgp-id-box-container channel-content'>{$pgp_id_box_content}</div>" +
        "</form>";

    var MANAGE_TEMPLATE_ENTRY =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<fieldset class='pgp-id-box pgp-id-box:{$id_private}{$class}'>" +
            "<legend class='user'>{$user_id}</legend>" +
            "<label><strong>ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='fingerprint'>{$id_private}</span></label><br/>" +
            "<label><strong>Sub ID:&nbsp;&nbsp;&nbsp;&nbsp;</strong> {$id_public}</label><br/>" +
            "<label><strong>User ID:&nbsp;&nbsp;&nbsp;</strong> <span class='user'>{$user_id}</span></label><br/>" +
            "<label><strong>Email:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='email'>{$user_email}</span></label><br/>" +
            "<label><strong>Passphrase:</strong> {$passphrase_required}</label><br/>" +
            "<label><strong>Is Default:</strong> {$is_default}</label><br/>" +
            "<label><strong>Actions:&nbsp;&nbsp;&nbsp;</strong> " +
                "<select name='actions' onselect='window[this.value](event, \"{$id_private}\"); ' oninput='window[this.value](event, \"{$id_private}\"); '>" +
                    "<option selected='selected'>Select action</option>" +
                    "<option disabled='disabled'>Make Default Identity</option>" +
                    "<option value='changePGPManageFormKeyPassphrase'>Change Password</option>" +
                    //"<option value='changePGPManageFormKeyPassphrase'>Add Password</option>" +

                    "<option disabled='disabled'>Sign/Encrypt Text</option>" +
                    "<option disabled='disabled'>Decrypt Message</option>" +
                    "<option disabled='disabled'>Export Public Key Block</option>" +
                    "<option disabled='disabled'>Export Private Key Block</option>" +
                    "<option value='deletePGPManageFormKey'>Delete Private Key</option>" +
                "</select>" +
            "</label><br/>" +
        "</fieldset>";


    /**
     * @param commandString KEYGEN --bits [2048] [user id]
     */
    self.keygenCommand = function (commandString) {
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
            self.routeResponseToClient("RLOG " + PATH_MAIN + " " + GENERATE_TEMPLATE
                    .replace(/{\$send_as_socket_command}/gi, send_as_socket_command ? '1' : '0')
                    .replace(/{\$[^}]+}/gi, '')
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

                        self.routeResponseToClient("RLOG " + PATH_MAIN + " " + REGISTER_TEMPLATE
                                .replace(/{\$private_key}/gi, pgp_private)
                                .replace(/{\$[^}]+}/gi, '')
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

    self.keygenResponse = function(e) {
        throw new Error("keygen response is not implemented");
    };

    /**
     * @param commandString REGISTER
     */
    self.registerCommand = function (commandString) {
        var privateKeyBlock = '';
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
            //routeResponseToClient("RLOG " + PATH_MARKER + " " + KEYGEN_CLOSED_TEMPLATE);
            self.routeResponseToClient("RLOG " + PATH_MAIN + " " + REGISTER_TEMPLATE
                    .replace(/{\$private_key}/gi, privateKeyBlock)
                    .replace(/{\$[^}]+}/gi, '')
            );
            return;
        }

        getPGPDB(function(db, PGPDB) {
            PGPDB.addPrivateKeyBlock(privateKeyBlock, function(err, data) {
                if(err) {
                    self.routeResponseToClient("RLOG " + PATH_MAIN + " " + REGISTER_TEMPLATE
                            .replace(/{\$status_content}/gi, err)
                            .replace(/{\$private_key}/gi, privateKeyBlock)
                            .replace(/{\$[^}]+}/gi, '')
                    );
                } else {
                    self.manageCommand("MANAGE");

                }
            });
        });

    };

    self.registerResponse = function(e) {
        throw new Error("keygen response is not implemented");
    };



    /**
     * @param commandString UNREGISTER [PGP Private Key Fingerprint]
     */
    self.unregisterCommand = function (commandString) {
        var match = /^unregister\s+(.*)$/im.exec(commandString);
        var privateKeyFingerprint = match[1].trim();
        var privateKeyID = privateKeyFingerprint.substr(privateKeyFingerprint.length - 16);

        getPGPDB(function (db, PGPDB) {
            var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
            var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

            var insertRequest = privateKeyStore.delete(privateKeyID);
            insertRequest.onsuccess = function(event) {
                var status_content = "Deleted private key block from database: " + privateKeyID;
                console.log(status_content);
                self.manageCommand("MANAGE", status_content);

            };
            insertRequest.onerror = function(event) {
                var err = event.currentTarget.error;
                var status_content = "Error adding private key (" + privateKeyID + ") database: " + err.message;
                console.error(status_content, event);
                self.manageCommand("MANAGE", status_content);

            };
        });
    };

    self.unregisterResponse = function(e) {
        throw new Error("keygen response is not implemented");
    };


    /**
     * @param commandString
     * @param status_content
     */
    self.manageCommand = function (commandString, status_content) {
        //var match = /^manage$/im.exec(commandString);

        self.routeResponseToClient("RLOG " + PATH_MAIN + " " + MANAGE_TEMPLATE
                .replace(/{\$status_content}/gi, status_content || '')
                .replace(/{\$[^}]+}/gi, '')
        );

        getPGPDB(function(db, PGPDB) {
            PGPDB.queryPrivateKeys(function(data) {
                self.routeResponseToClient("LOG " + PATH_MAIN + " " + MANAGE_TEMPLATE_ENTRY
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
                        .replace(/{\$[^}]+}/gi, '')
                );
            });
        });

    };

    self.manageResponse = function(e) {
        throw new Error("manage response is not implemented");
    };




    var identifyRequests = [];
    /**
     * @param commandData IDENTIFY --session [session-uid] --id [pgp-key-id] --username [username] --visibility [visibility]
     */
    self.identifyCommand = function (commandData, e) {
        if(typeof commandData === 'string')
            commandData = {message: commandData, passphrase: null};
        var commandString = commandData.message;

        if(identifyRequests.length === 0) {
            throw new Error("No IDENTIFY REQUESTS received");
        }

        var match = /^identify\s?([\s\S]*)$/im
            .exec(commandString);
        if(!match)
            throw new Error("Could not match identify command");
        var identifyContent = match[1] || '';

        var session_uid = null; // match[1];
        var selectedPGPKeyID = null; // match[2];
        var selectedPrivateKeyData = null; // null;
        var username = null; // match[3];
        var visibility = null; // match[4];
        //var cacheTime = match[5];

        identifyContent = identifyContent.replace(/--session (\S+)/i, function(match, contents, offset, s) {
            session_uid = contents; return '';
        });
        identifyContent = identifyContent.replace(/--id (\S+)/i, function(match, contents, offset, s) {
            selectedPGPKeyID = contents; return '';
        });
        identifyContent = identifyContent.replace(/--username (\S+)/i, function(match, contents, offset, s) {
            username = contents; return '';
        });
        identifyContent = identifyContent.replace(/--visibility (\S+)/i, function(match, contents, offset, s) {
            visibility = contents; return '';
        });

        match = /IDSIG (\S+) /i.exec(identifyContent);
        if(match && match[1]) {
            //throw new Error("Could not find challenge string");
            session_uid = match[1];

            var foundRequest = null;
            for (var j = 0; j < identifyRequests.length; j++) (function(identifyRequest) {
                if (identifyRequest[0].indexOf("IDENTIFY " + session_uid) !== -1) {
                    foundRequest = identifyRequest;
                }
            })(identifyRequests[j]);

            if(!foundRequest)
                throw new Error("Could not find IDENTITY request: " + session_uid);

            var sendSocket = foundRequest[1];
            sendSocket.send(commandString);
            console.log("SOCKET OUT (" + sendSocket.url + "): " + commandString);

            return;
        }
            //throw new Error("Could not find original IDENTIFY request socket: " + challengeString);

        getPGPDB(function(db, PGPDB) {
            var pgp_id_options_html = '';
            //var id_signature = null;
            var password_style = 'display: none';
            var password_required = '';
            var auto_identify_checked_attr = '';
            var username = '';
            var pgpIDCount = 0;

            var status_content = '';

            PGPDB.queryPrivateKeys(function(privateKeyData) {

                var keyID = privateKeyData.id_private;
                pgpIDCount++;

                if(privateKeyData.default === '1') {
                    if(!selectedPGPKeyID)
                        selectedPGPKeyID = privateKeyData.id_private;
                }

                var defaultUsername = privateKeyData.user_name || privateKeyData.user_id;
                defaultUsername = defaultUsername.trim().split(/@/, 2)[0].replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_');

                if(privateKeyData.id_private === selectedPGPKeyID) {
                    selectedPrivateKeyData = privateKeyData;
                    username = defaultUsername;
                }

                pgp_id_options_html +=
                    '<option ' + (privateKeyData.default === '1' ? 'selected="selected"' : '') + ' value="' + keyID + '">' +
                    (privateKeyData.passphrase_required ? '(*) ' : '') + privateKeyData.user_id.replace(/</, '&lt;') +
                    '</option>';

                if(privateKeyData.default === '1' && privateKeyData.passphrase_required) {
                    password_style = '';
                    password_required = 'required';
                }




            }, function() {

                for(var i=0; i<identifyRequests.length; i++) (function(identifyRequest) {
                    var responseString = identifyRequest[0];
                    var socket = identifyRequest[1];
                    match = /^identify\s+(\S*)/im.exec(responseString);
                    if(!match)
                        throw new Error("Invalid IDENTIFY: " + responseString);
                    var session_uid = match[1];

                    var status_content = "<span class='info'>IDENTIFY request received from</br>[" + socket.url + "]</span>";

                    if(pgpIDCount === 0)
                        status_content += "<br/><span class='error'>No PGP Private Keys found on the client. Please import or <a href='#KEYGEN' onclick='send(\"KEYGEN\");'>generate</a> a new PGP Key and re-<a href='#IDENTIFY' onclick='send(\"IDENTIFY\");'>identify</a>.</span>";

                    //signWithPrivateKey(identityString, selectedPrivateKeyData.block_private, commandData.passphrase,
                    //    function(err, signedIdentityString) {

                            self.routeResponseToClient("RLOG " + PATH_ID_REQUEST + " " + IDENTIFY_TEMPLATE
                                    .replace(/{\$status_content}/gi, status_content || '')
                                    //.replace(/{\$id_signature}/gi, signedIdentityString || '')
                                    .replace(/{\$socket_url}/gi, socket.url || '')
                                    .replace(/{\$socket_host}/gi, socket.url.split('/')[2] || '')
                                    .replace(/{\$pgp_id_options}/gi, pgp_id_options_html || '')
                                    .replace(/{\$session_uid}/gi, session_uid || '')
                                    .replace(/{\$password_style}/gi, password_style || '')
                                    .replace(/{\$password_required}/gi, password_required || '')
                                    .replace(/{\$auto_identify_checked_attr}/gi, auto_identify_checked_attr || '')
                                    //.replace(/{\$username}/gi, username.replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_') || '')
                                    .replace(/{\$[^}]+}/gi, '')
                            );
                        //});

                })(identifyRequests[i]);
            });
        });
    };



    /**
     * @param responseString [challenge_string] [session_id]
     */
    self.identifyResponse = function (responseString, e) {
        identifyRequests.push([responseString, e.target]);
        self.identifyCommand("IDENTIFY", e);
    };

    /**
     * @param commandData IDSIG [challenge-string] [session-id] [pgp-key-id] [username] [visibility]
     */
    self.idsigResponse = function (commandData, e) {
        var split = commandData.split(/\s+/g);
        if(split[0].toUpperCase() !== 'IDSIG')
            throw new Error("Invalid IDSIG: " + commandData);

        var session_uid = split[1];
        var pgp_key_id = split[2];
        var username = split[3];
        var visibility = split[4];

        var status_content =
            "<label><strong>User ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='user'>" + username + "</span><br/></label>" +
            "<label><strong>PGP Key ID:&nbsp;&nbsp;&nbsp;</strong> <span class='pgp-id'>" + pgp_key_id + "</span><br/></label>" +
            "<label><strong>Session ID:&nbsp;&nbsp;&nbsp;</strong> <span class='session-uid'>" + session_uid + "</span><br/></label>" +
            "<label><strong>Visibility:&nbsp;&nbsp;&nbsp;</strong> <span class='visibility'>" + visibility + "</span><br/></label>" +
            "<div class='idsig' style='padding: 1em'>" + commandData + "</div>";

        for (var j = 0; j < identifyRequests.length; j++) (function(identifyRequest) {
            if (identifyRequest[0].indexOf("IDENTIFY " + session_uid) !== -1) {
                var socket = identifyRequest[1];

                self.routeResponseToClient("RLOG " + PATH_ID_REQUEST + " " + IDENTIFY_TEMPLATE_SUCCESS
                        .replace(/{\$status_content}/gi, status_content || '')
                        .replace(/{\$socket_url}/gi, socket.url || '')
                        .replace(/{\$socket_host}/gi, socket.url.split('/')[2] || '')
                        .replace(/{\#session_uid}/gi, session_uid || '')
                        .replace(/{\$[^}]+}/gi, '')
                );

                console.info("Removing IDENTIFY request: ", identifyRequest);
                identifyRequests.splice(j, 1);
                j--;
            }
        })(identifyRequests[j]);


        getPGPDB(function(db, PGPDB) {
           PGPDB.addIDSIGToDatabase(commandData, function(err, sessionData) {
                if(err)
                    throw new Error(err);


           }) ;
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
        if(typeof self.PGPDB !== 'function')
            importScripts('pgp/pgp-db.js');

        self.PGPDB(callback);
    }

})();

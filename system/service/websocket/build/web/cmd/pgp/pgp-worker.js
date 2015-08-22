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
            "<input type='submit' value='Generate'  name='submit-generate' />" +
            " or <a href='#REGISTER'>Load your own PGP private key</a>" +
            
            "<input type='hidden' name='send_as_socket_command' value='{$send_as_socket_command}' />" +

        "</form>";

    var REGISTER_TEMPLATE =
        "<script src='cmd/pgp/pgp-form.js'></script>" +
        "<link rel='stylesheet' href='cmd/pgp/pgp.css' type='text/css'>" +
        "<legend>Register a new PGP Key Pair</legend>" +
        "<form name='pgp-register-form' action='#' onsubmit='return submitPGPRegisterForm(event);'>" +
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
        "<legend>Identify yourself to the network</legend>" +
        "<form name='pgp-identify-form' action='#' onsubmit='return submitPGPIdentifyForm(event);'>" +
            "<div class='status-box'>{$status_content}</div>" +

            "<label class='label-pgp-id'>Identify using PGP Identity:<br/>" +
                "<select name='pgp-id' required='required' onfocus='focusPGPIdentifyForm(event)' onselect='focusPGPIdentifyForm(event)' oninput='focusPGPIdentifyForm(event)'>" +
                    "<optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>" +
                        "{$pgp_id_options}" +
                    "</optgroup>" +
                    "<optgroup disabled='disabled' label='Other options'>" +
                    "<option value=''>Manage PGP Identities...</option>" +
                    "</optgroup>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-passphrase' oninput='focusPGPIdentifyForm(event)' style='{$password_style}'>PGP Passphrase (if required):<br/>" +
                "<input type='password' name='passphrase' required='{$password_required}' placeholder='Enter your PGP Passphrase'/>" +
            "<br/><br/></label>" +


            "<label class='label-username' oninput='focusPGPIdentifyForm(event)'>Your <strong>Session Username</strong> (how you appear to others while connected):<br/>" +
                "<input type='text' name='username' required='required' placeholder='Enter a user name' value='{$username}'/>" +
            "<br/><br/></label>" +

            "<label class='label-visibility'>Who should be able to request your <br/><strong>Identification Signature</strong> while you're online?<br/>" +
                "<select name='visibility'>" +
                    "<option value=':all'>Anyone (including anonymous users)</option>" +
                    "<option value=':identified'>Only other identified users</option>" +
                    "<option value=':none'>No one (Only username and key id)</option>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-content'>What content should be included along with your ID Signature?<br/>" +
                "<select name='contents'>" +
                    "<option value=':pub:idsig'>Just the Public Key and IDSIG (No profile)</option>" +
                    "<option value=':pub:idsig:profile'>Public Key, IDSIG and Signed Profile</option>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label class='label-cache-time'>How long should your ID Signature (and included content)<br/>stay cached on the server after you disconnect?<br/>" +
                "<select name='cache_time'>" +
                    "<option value='0'>Remove immediately</option>" +
                    "<option value='60'>Remove after 1 minute</option>" +
                    "<option value='3600'>Remove after 1 hour</option>" +
                    "<option value='max'>Keep on server as long as possible</option>" +
                    "<option onclick='clickPGPIdentityCustomCacheTime(event)' value='-1'>Custom Value</option>" +
                "</select>" +
            "<br/><br/></label>" +

            "<label>This is your <strong>Identification Signature</strong> for this session<br/>(What others see when they request your <i>IDSIG</i>):<br/>" +
                "<textarea required='required' name='id_signature' required='required' rows='12' cols='68'>{$id_signature}</textarea>" +
            "<br/></label>" +

            "<hr/>Register:<br/>" +
            //"<input type='button' name='submit-sign' value='Sign' onclick='focusPGPIdentifyForm(event)'/>" +
            "<input type='submit' name='submit-identify' value='Identify'/>" +
            "<input type='hidden' name='session_id' value='{$session_id}'/>" +
            "<input type='hidden' name='challenge_string' value='{$challenge_string}'/>" +
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
        "<fieldset class='pgp-id-box pgp-id-box:{$id_private}'>" +
            "<legend class='user'>{$user_id}</legend>" +
            "<label><strong>ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='fingerprint'>{$id_private}</span></label><br/>" +
            "<label><strong>Sub ID:&nbsp;&nbsp;&nbsp;&nbsp;</strong> {$id_public}</label><br/>" +
            "<label><strong>User ID:&nbsp;&nbsp;&nbsp;</strong> <span class='user'>{$user_id}</span></label><br/>" +
            "<label><strong>Email:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='email'>{$user_email}</span></label><br/>" +
            "<label><strong>Passphrase:</strong> {$passphrase_required}</label><br/>" +
            "<label><strong>Actions:&nbsp;&nbsp;&nbsp;</strong> " +
                "<select name='actions' onselect='window[this.value](event, \"{$id_private}\"); ' oninput='window[this.value](event, \"{$id_private}\"); '>" +
                    "<option selected='selected'>Select action</option>" +
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
     * @param commandString [signed_identity]
     */
    self.identifyCommand = function (commandString, e) {
        var match1 = /IDSIG (\S+) /i.exec(commandString);
        if(!match1 || !match1[1])
            throw new Error("Could not find challenge string");
        var challengeString = match1[1];
        for(var i=0; i<identifyRequests.length; i++) {
            if(identifyRequests[i][0].indexOf("IDENTIFY " + challengeString) !== -1) {
                var socket = identifyRequests[i][1];
                socket.send(commandString);
                console.log("SOCKET OUT (" + socket.url + "): " + commandString);
                //console.info("Removing IDENTIFY request: " + identifyRequests[i]);
                //identifyRequests.splice(i, 1);
                return;
            }
        }
        throw new Error("Could not find original IDENTIFY request socket: " + challengeString);
    };

    /**
     * @param responseString [challenge_string] [session_id]
     */
    self.identifyResponse = function (responseString, e) {
        identifyRequests.push([responseString, e.target]);

        var socket = e.target;
        var match = /^identify\s+(\S*)\s+(\S*)/im.exec(responseString);
        var challenge_string = match[1];
        var session_id = match[2];
        //console.log(socket, challenge_string, session_id);

        var selectedKeyID = null;
        var pgp_id_options_html = '';
        var id_signature = null;
        var password_style = '';
        var password_required = '';

        var username = '';

        getPGPDB(function(db, PGPDB) {

            PGPDB.queryPrivateKeys(function(privateKeyData) {

                var keyID = privateKeyData.id_private;
                if(!selectedKeyID) {
                    selectedKeyID = keyID;
                }

                if(selectedKeyID === keyID) {
                    username = privateKeyData.user_name || privateKeyData.user_id;
                }

                pgp_id_options_html +=
                    '<option ' + (keyID === selectedKeyID ? 'selected="selected"' : '') + ' value="' + keyID + '">' +
                    (privateKeyData.passphrase_required ? '(*) ' : '') + privateKeyData.user_id.replace(/</, '&lt;') +
                    '</option>';

                if(selectedKeyID === keyID && privateKeyData.passphrase_required) {
                    password_style = 'display: none';
                    password_required = 'required';
                }


            }, function() {
                self.routeResponseToClient("RLOG " + PATH_ID_REQUEST + " " + IDENTIFY_TEMPLATE
                        //.replace(/{\$status_content}/gi, status_content || '')
                        .replace(/{\$id_signature}/gi, id_signature || '')
                        .replace(/{\$pgp_id_options}/gi, pgp_id_options_html || '')
                        .replace(/{\$challenge_string}/gi, challenge_string || '')
                        .replace(/{\$session_id}/gi, session_id || '')
                        .replace(/{\$username}/gi, username || '')
                        .replace(/{\$[^}]+}/gi, '')
                );
            });
        });


        //var socketKeyID = null;
        //if(typeof pgpConfig['socket-id-url:' + newSocket.url] !== 'undefined')
        //    socketKeyID = pgpConfig['socket-id-url:' + newSocket.url];
        //else if(typeof pgpConfig['socket-id-url-default'] !== 'undefined')
        //    socketKeyID = pgpConfig['socket-id-url-default'];
        //
        //getPGPDB(function(db, PGPDB) {
        //    PGPDB.queryPrivateKeys(function(privData) {
        //        if(!socketKeyID)
        //            socketKeyID = privData.id_private;
        //        if(socketKeyID === privData.id_private) {
        //            PGPDB.getPublicKey(privData.id_public, function(err, pubData) {
        //                if(err)
        //                    throw new Error(err);
        //
        //
        //
        //                socket.send("IDENTIFY " + pubData.block_public +
        //                "\n" + pubData.user_profile_signed);
        //
        //            });
        //            return true;
        //        }
        //    });
        //});
    };


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

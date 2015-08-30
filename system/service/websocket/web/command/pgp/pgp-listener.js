/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'pgp:';
    var CONFIG_ID = 'pgp';
    var AUTO_IDENTIFY_TIMEOUT = 10;

    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('change', onFormEvent);
    self.addEventListener('log', onLog);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'pgp-keygen-form':
                if(e.type === 'submit')
                    submitPGPKeyGenForm(e, formElm);
                return true;

            case 'pgp-register-form':
                focusPGPRegisterForm(e, formElm);
                if(e.type === 'submit')
                    submitPGPRegisterForm(e, formElm);
                return true;

            case 'pgp-manage-form':
                if(e.type === 'submit')
                    submitPGPManageForm(e, formElm);
                return true;

            case 'pgp-identify-form':
                saveAutoIdentify(e, formElm);
                generateIDSIG(e, formElm);
                if(e.type === 'submit')
                    submitPGPIdentifyForm(e, formElm);

                return true;

            case 'pgp-identify-success-form':
                saveAutoIdentify(e, formElm);
                //if(e.type === 'submit') { TODO:
                return true;

            default:
                return false;
        }
    }


    // Auto focus

    var pgpAutoSubmitElms = document.getElementsByClassName('pgp-auto-submit-form');
    var onLog = function(e) {
        for(var i=pgpAutoSubmitElms.length-1; i>=0; i--) (function(pgpAutoSubmitElm) {
            pgpAutoSubmitElm.classList.remove('pgp-auto-submit-form');
            var form = typeof pgpAutoSubmitElm.form !== 'undefined' ? pgpAutoSubmitElm.form : pgpAutoSubmitElm;
            onFormEvent(e, form);
        })(pgpAutoSubmitElms[i]);
    };
    setTimeout(function() {
        var e = new CustomEvent('load');
        onLog(e);
    }, 500);

    // Event Handlers

    function submitPGPKeyGenForm(e, formElm) {
        e.preventDefault();
        var bits = formElm.querySelector('*[name=bits]').value;
        var userID = formElm.querySelector('*[name=user_id]').value;
        var passphrase = formElm.querySelector('*[name=passphrase]').value;
        var send_as_socket_command = parseInt(formElm.querySelector('*[name=send_as_socket_command]').value);

        formElm.querySelector('*[type=submit]').setAttribute('disabled', 'disabled');
//0 &&
        if(send_as_socket_command) {
            setStatus(formElm, "Generating new PGP Key via socket command...");
            var commandString = 'KEYGEN --bits ' + bits;
            if(passphrase)
                commandString += ' --passphrase ' + passphrase;
            commandString += ' --user ' + userID;

            var messageEvent = new CustomEvent('socket', {
                detail: commandString
            });
            document.dispatchEvent(messageEvent);

        } else {
            setStatus(formElm, "Generating new PGP Key via client...");



            openpgp.generateKeyPair({
                keyType:1,
                numBits:bits,
                userId:userID,
                passphrase:passphrase

            }).then(function(NewKey) {
                var newKeyID = NewKey.key.getKeyIds()[0].toHex();
                console.log("New PGP Key Generated: " + newKeyID);

                var messageEvent = new CustomEvent('socket', {
                    detail: "REGISTER --show-form " + NewKey.privateKeyArmored,
                    cancelable:true
                });
                document.dispatchEvent(messageEvent);

            });
        }

    }

    function focusPGPRegisterForm(e, formElm) {
        var privateKeyElm = formElm.querySelector('*[name=private_key]');
        var privateKeyValue = privateKeyElm.value;
        var submitElm = formElm.querySelector('input[type=submit]');

        if(privateKeyValue.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1) {
            submitElm.setAttribute('disabled', 'disabled');
        } else {
            submitElm.removeAttribute('disabled');
        }

        return formElm;
    }

    function submitPGPRegisterForm(e, formElm) {
        e.preventDefault();
        var privateKeyElm = formElm.querySelector('*[name=private_key]');
        var privateKeyValue = privateKeyElm.value;

        if(privateKeyValue.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1)
            throw new Error("PGP PRIVATE KEY BLOCK not found");

        var privateKey = window.openpgp.key.readArmored(privateKeyValue).keys[0];

        var messageEvent = new CustomEvent('socket', {
            detail: "REGISTER " + privateKey.armor(),
            cancelable:true
        });
        document.dispatchEvent(messageEvent);
    }


    function submitPGPManageForm(e, formElm) {
        e.preventDefault();
        var actionElm = formElm.querySelector('[name=action]');
        console.info("ACTION: " + actionElm.value);
        switch(actionElm.value) {
            case 'default':
            case 'change':
            case 'sign':
            case 'verify':
            case 'encrypt':
            case 'decrypt':
            case 'export-public':
            case 'export':
            case 'delete':
            default:
                break;
        }
        //var deleteKeyID = "WUT";
        //var messageEvent = new CustomEvent('socket', {
        //    detail: "UNREGISTER " + deleteKeyID,
        //    cancelable:true
        //});
        //formElm.dispatchEvent(messageEvent);
    }



    var lastIDSIG = null;

    var cancelReceived = false;
    var autoIdentifyStartTime = null;
    function generateIDSIG(e, formElm) {
        if(autoIdentifyStartTime && e.type === 'change') {
            var elapsedSeconds = parseInt(new Date().getTime() / 1000 - autoIdentifyStartTime);
            if(elapsedSeconds > 2) {
                cancelReceived = true;
                console.info("Cancel received by ", e.target);
            }
        }
        ConfigDB.getConfig(CONFIG_ID, function(err, CONFIG) {
            if(err)
                throw new Error(err);

            var passphraseElm = formElm.querySelector('[name=passphrase]');
            if(typeof passphraseElm.parentNode._original_display === 'undefined')
                passphraseElm.parentNode._original_display = passphraseElm.parentNode.style.display;
            var idSignatureElm = formElm.querySelector('[name=id_signature]');
            var submitSectionElm = formElm.getElementsByClassName('submit-section')[0];
            var visibilityElm = formElm.querySelector('[name=visibility]');
            var socketHostElm = formElm.querySelector('[name=socket_host]');
            var selectedPGPPublicKeyIDElm = formElm.querySelector('[name=pgp_id_public]');
            var autoIdentifyElm = formElm.querySelector('[name=auto_identify]');

            var usernameElm = formElm.querySelector('[name=username]');
            var username = usernameElm.value;

            var visibility = '';
            for(var vi=0; vi<visibilityElm.length; vi++)
                if(visibilityElm[vi].selected)
                    visibility = (visibilityElm[vi].value[0] !== '_' ? visibility : '') + visibilityElm[vi].value.replace('_', '');
            var session_uid = formElm.querySelector('[name=session_uid]').value;
            //var autoIdentify = formElm.querySelector('[name=auto_identify]').value;

            var autoIdentify = false;
            if(CONFIG && !formElm.classList.contains('auto-identify-attempted')) {
                autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socketHostElm.value] || false;
                if(autoIdentify) {
                    selectedPGPPublicKeyIDElm.value = autoIdentify;
                }
                //if(CONFIG.autoIdentify)
                //    autoIdentifyElm.value = 'auto-all';
                //if(CONFIG['autoIdentifyHost:' + socketHostElm.value])
                //    autoIdentifyElm.value = 'auto-host';
            }
            var selectedPGPPublicKeyID = selectedPGPPublicKeyIDElm.value;

            if(/\s/.test(username)) {
                setStatus(formElm, "<span class='error'>Username may not contain spaces. Bummer :(</span>");
                return;
            }


            selectedPGPPublicKeyID = selectedPGPPublicKeyID.substr(selectedPGPPublicKeyID.length - 16);

            PGPDB(function (db) {
                var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
                var privateKeyDBStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

                var index = privateKeyDBStore.index('id_public');
                var req = index.get(selectedPGPPublicKeyID);
                req.onerror = function(err) {
                    throw new Error(err);
                };
                req.onsuccess = function (evt) {
                    var privateKeyData = evt.target.result;
                    if(!privateKeyData)
                        throw new Error("Private Key Not Found: " + selectedPGPPublicKeyID);

                    var privateKey = openpgp.key.readArmored(privateKeyData.block_private).keys[0];

                    if(!username || username.default === username) {
                        username = privateKey.getUserIds()[0].trim().split(/@/, 2)[0].replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_');
                        usernameElm.value = username;
                        usernameElm.default = username;
                    }

                    var identityString = "IDSIG" +
                        " " + selectedPGPPublicKeyID +
                        " " + session_uid +
                        " " + username +
                        " " + visibility;

                    if(!lastIDSIG || identityString !== lastIDSIG) {
                        lastIDSIG = identityString;
                        idSignatureElm.innerHTML = '';
                        submitSectionElm.style.display = 'none';
                        //setStatus(formElm, "");
                    }


                    if(privateKey.primaryKey.isDecrypted) {
                        passphraseElm.parentNode.style.display = 'none';
                        passphraseElm.removeAttribute('required');

                    } else {
                        passphraseElm.parentNode.style.display = passphraseElm.parentNode._original_display || 'block';
                        passphraseElm.setAttribute('required', 'required');
                    }

//             var publicKey = openpgp.key.readArmored(privateKeyData.block_pubic).keys[0];
                    if(!privateKey.primaryKey.isDecrypted) {
                        if (passphraseElm.value) {
                            privateKey.primaryKey.decrypt(passphraseElm.value);
                        } else {
                            setStatus(formElm, "<span class='passphrase'>PGP Passphrase required</span>", true);
                        }
                    }

                    if(privateKey.primaryKey.isDecrypted) {

                        if(!idSignatureElm.innerHTML) {
                            setStatus(formElm, "Signing Identity...", true);
                            openpgp.signClearMessage(privateKey, identityString)
                                .then(function (signedIDString) {

                                    setStatus(formElm, "<span class='success'>" + "Signature successful. Ready to IDENTIFY!" + "</span>");
                                    idSignatureElm.innerHTML = signedIDString.trim();
                                    //idSignatureElm.innerHTML += "\n" + privateKeyData.user_profile_signed;
                                    idSignatureElm.innerHTML += "\n" + privateKeyData.block_public;
                                    submitSectionElm.style.display = 'block';

                                    if(autoIdentify) {
                                        autoIdentifyStartTime = new Date().getTime() / 1000;
                                        var interval = setInterval(function () {
                                            if(cancelReceived) {
                                                clearInterval(interval);
                                                setStatus(formElm, "<span class='error'>" + "Auto-Identify Canceled" + "</span>", 5);
                                                formElm.classList.add('auto-identify-attempted');
                                                return;
                                            }
                                            var elapsedSeconds = parseInt(new Date().getTime() / 1000 - autoIdentifyStartTime);
                                            var secondsLeft = AUTO_IDENTIFY_TIMEOUT - elapsedSeconds;
                                            setStatus(formElm, "<span class='pending'>" + "Auto-Identifying in " + (secondsLeft) + " second" + (secondsLeft === 1 ? "" : "s") + "...</span>", 1);

                                            if(elapsedSeconds < AUTO_IDENTIFY_TIMEOUT)
                                                return;

                                            clearInterval(interval);
                                            submitPGPIdentifyForm(e, formElm);

                                        }, 1000);
                                    }
                                });
                        }

                    } else {
                        idSignatureElm.innerHTML = '';
                        submitSectionElm.style.display = 'none';

                    }
                };
            });
        });


        return formElm;
    }

    function saveAutoIdentify(e, formElm) {
        var autoIdentifyElm = formElm.querySelector('[name=auto_identify]');
        var autoIdentifyLastValue = autoIdentifyElm.getAttribute('data-last-value');
        autoIdentifyElm.setAttribute('data-last-value', autoIdentifyElm.value);
        if(!autoIdentifyLastValue || autoIdentifyLastValue === autoIdentifyElm.value)
            return false;

        var pgpPublicIDElm = formElm.querySelector('[name=pgp_id_public]');
        var socketHostElm = formElm.querySelector('[name=socket_host]');

        var newConfigData = {'id': CONFIG_ID};
        newConfigData['autoIdentify'] = null;
        newConfigData['autoIdentifyHost:' + socketHostElm.value] = null;

        if(!pgpPublicIDElm.value)
            throw new Error("Invalid Socket Host in form field 'pgp_id_public'");

        switch(autoIdentifyElm.value) {
            case 'ask':
                break;

            case 'auto-host':
                if(!socketHostElm.value)
                    throw new Error("Invalid Socket Host in form field 'socket_host'");

                newConfigData['autoIdentifyHost:' + socketHostElm.value] = pgpPublicIDElm.value;
                break;

            case 'auto-all':
                newConfigData['autoIdentify'] = pgpPublicIDElm.value;
                break;

            default:
                throw new Error("Invalid auto_identify option: " + autoIdentifyElm.value);
        }

        ConfigDB.addConfigToDatabase(newConfigData);
        setStatus(formElm, "<span class='info'>Saved settings successfully</span>", 5, true);

        return true;
    }

    function submitPGPIdentifyForm(e, formElm) {
        e.preventDefault();
        var idSignatureElm = formElm.querySelector('*[name=id_signature]');
        var passphraseElm = formElm.querySelector('[name=passphrase]');


        var pgp_id_public = formElm.querySelector('[name=pgp_id_public]').value;
        var username = formElm.querySelector('[name=username]').value;
        //var challenge_string = formElm.querySelector('[name=challenge_string]').value;
        var visibilityElm = formElm.querySelector('[name=visibility]');
        var visibility = '';
        for(var vi=0; vi<visibilityElm.length; vi++)
            if(visibilityElm[vi].selected)
                visibility = (visibilityElm[vi].value[0] !== '_' ? visibility : '') + visibilityElm[vi].value.replace('_', '');
        var idSigString = idSignatureElm.value;
        var submitSectionElm = formElm.getElementsByClassName('submit-section')[0];

        if(idSigString.indexOf("-----BEGIN PGP SIGNED MESSAGE-----") === -1)
            throw new Error("BEGIN PGP SIGNED MESSAGE not found");

        //var commandString = "IDENTIFY --challenge " + challenge_string + " --id " + pgp_id + " --username " + username + " --visibility " + visibility;

        var messageEvent = new CustomEvent('socket', {
            detail: {
                message:  "IDSIG " + idSigString, // commandString, //
                passphrase: passphraseElm.value
            },
            cancelable:true
        });
        document.dispatchEvent(messageEvent);
        idSignatureElm.innerHTML = '';
        submitSectionElm.style.display = 'none';
        formElm.classList.add('form-success');
        passphraseElm.value = '';
        //setStatus(formElm, "<span class='success'>IDSIG Sent Successfully</span>");

    }

    function setStatus(formElm, statusText, prepend, unique) {
        var statusElms = formElm.getElementsByClassName('status-box');
        for(var i=0; i<statusElms.length; i++) (function(statusElm) {
            var textDiv = document.createElement('div');
            textDiv.innerHTML = statusText;
                
            if(unique && statusElm.innerHTML.indexOf(textDiv.innerHTML) !== -1)
                return;

            if(prepend) {
                statusElm.firstChild
                    ? statusElm.insertBefore(textDiv, statusElm.firstChild)
                    : statusElm.appendChild(textDiv);
                if(typeof prepend === 'number')
                    setTimeout(function () {
                        if(textDiv && textDiv.parentNode)
                            textDiv.parentNode.removeChild(textDiv);
                    }, prepend * 1000);
            } else {
                statusElm.innerHTML = statusText;
            }
        })(statusElms[i]);
    }



    // IE Fix
    if(typeof CustomEvent === 'undefined')
        (function () {
            function CustomEvent ( event, params ) {
                params = params || { bubbles: false, cancelable: false, detail: undefined };
                var evt = document.createEvent( 'CustomEvent' );
                evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
                return evt;
            }

            CustomEvent.prototype = window.Event.prototype;

            window.CustomEvent = CustomEvent;
        })();


    // Includes

    function includeScript(scriptPath, onInsert) {
        var head = document.getElementsByTagName('head')[0];
        if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
            var newScript = document.createElement('script');
            newScript.setAttribute('src', scriptPath);
            head.appendChild(newScript);
            if(onInsert)
                onInsert();
        }
    }

    // For Config Access
    includeScript('command/config/config-db.js');

    // For Public/Private Key Database access
    includeScript('command/pgp/pgp-db.js');

    // For PGP Decryption in chat rooms
    var openPGPScriptPath = 'command/pgp/lib/openpgpjs/openpgp.js';
    includeScript(openPGPScriptPath, function() {

        var timeout = setInterval(function() {
            var src = openPGPScriptPath.replace('/openpgp.', '/openpgp.worker.');
            if(!window.openpgp || window.openpgp._worker_init)
                return;
            window.openpgp.initWorker(src);
            window.openpgp._worker_init = true;
            clearInterval(timeout);
             //console.info("OpenPGP Worker Loaded: " + src);
        }, 500);
    });

//
//    var SCRIPT_PATH = 'command/pgp/lib/openpgpjs/openpgp.js';
//    var head = document.getElementsByTagName('head')[0];
//    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
//        var newScript = document.createElement('script');
//        newScript.setAttribute('src', SCRIPT_PATH);
//        head.appendChild(newScript);
//
//        var timeout = setInterval(function() {
//            var src = SCRIPT_PATH.replace('/openpgp.', '/openpgp.worker.');
//            if(!window.openpgp || window.openpgp._worker_init)
//                return;
//            window.openpgp.initWorker(src);
//            window.openpgp._worker_init = true;
//            clearInterval(timeout);
////             console.info("OpenPGP Worker Loaded: " + src);
//        }, 500);
//    }


})();


//var keys = (new openpgp.Keyring.localstore()).loadPrivate();


//var pgpMessage = openpgp.message.readArmored(encryptedMessage);
//var encIDs = pgpMessage.getEncryptionKeyIds();

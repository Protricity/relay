/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'pgp:';

    var selectedPublicKeyID = null;

    window.submitPGPKeyGenForm = function(e) {
        e.preventDefault();
        var formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Not a Form: " + formElm.nodeName);
        if(formElm.getAttribute('name') !== 'pgp-keygen-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));


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

                //setTimeout(function(e) {
                //    var formElm = document.querySelector('form[name=pgp-register-form]');
                //    var privateKeyElm = formElm.querySelector('textarea[name=private_key]');
                //    privateKeyElm.value = NewKey.privateKeyArmored;
                //
                //    setStatus(formElm, "New PGP Key Generated: " + newKeyID + ".<br/>You may now <span class='action'>register</span> your new private key");
                //}, 100);

            });
        }

    };

    function focusPGPRegisterForm(e) {
        var formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Not a Form: " + formElm.nodeName);
        if(formElm.getAttribute('name') !== 'pgp-register-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));

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

    window.changePGPRegisterForm = focusPGPRegisterForm;

    window.submitPGPRegisterForm = function(e) {
        e.preventDefault();
        var formElm = focusPGPRegisterForm(e);
        var privateKeyElm = formElm.querySelector('*[name=private_key]');
        var privateKeyValue = privateKeyElm.value;

        if(privateKeyValue.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1)
            throw new Error("PGP PRIVATE KEY BLOCK not found");

        var privateKey = window.openpgp.key.readArmored(privateKeyValue).keys[0];
        //var privateKeyID = privateKey.getKeyIds()[0].toHex();
        //var privateUserID = privateKey.getUserIds()[0];

        var messageEvent = new CustomEvent('socket', {
            detail: "REGISTER " + privateKey.armor(),
            cancelable:true
        });
        document.dispatchEvent(messageEvent);

    };



    window.focusPGPManageForm = function(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Not a Form: " + formElm.nodeName);
        if(formElm.getAttribute('name') !== 'pgp-manage-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));
        return formElm;
    };

    window.deletePGPManageFormKey = function(e, deleteKeyID) {
        var formElm = window.focusPGPManageForm(e);


        var messageEvent = new CustomEvent('socket', {
            detail: "UNREGISTER " + deleteKeyID,
            cancelable:true
        });
        document.dispatchEvent(messageEvent);

    };




    var lastIDString = null;
    window.focusPGPIdentifyForm = function(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Not a Form: " + formElm.nodeName);
        if(formElm.getAttribute('name') !== 'pgp-identify-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));


        var passphraseElm = formElm.querySelector('[name=passphrase]');
        if(typeof passphraseElm.parentNode._original_display === 'undefined')
            passphraseElm.parentNode._original_display = passphraseElm.parentNode.style.display;
        var idSignatureElm = formElm.querySelector('[name=id_signature]');
        var submitSectionElm = formElm.getElementsByClassName('submit-section')[0];
        var visibilityElm = formElm.querySelector('[name=visibility]');

        var usernameElm = formElm.querySelector('[name=username]');
        var username = usernameElm.value;

        var visibility = '';
        for(var vi=0; vi<visibilityElm.length; vi++)
            if(visibilityElm[vi].selected)
                visibility = (visibilityElm[vi].value[0] !== '_' ? visibility : '') + visibilityElm[vi].value.replace('_', '');
        var session_uid = formElm.querySelector('[name=session_uid]').value;
        var selectedPGPPublicKeyID = formElm.querySelector('[name=pgp_id_public]').value;
        var autoIdentify = formElm.querySelector('[name=auto_identify]').value;

        if(/\s/.test(username)) {
            setStatus(formElm, "<span class='error'>Username may not contain spaces. Bummer :(</span>");
            return formElm;
        }


        selectedPGPPublicKeyID = selectedPGPPublicKeyID.substr(selectedPGPPublicKeyID.length - 16);

        self.PGPDB(function (db, PGPDB) {
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

                if(!lastIDString || identityString !== lastIDString) {
                    lastIDString = identityString;
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

                                //if(autoIdentify) {
                                //    console.info("Auto-submitting form: ", formElm);
                                //    submitPGPIdentifyForm(e);
                                //}
                            });
                    }

                } else {
                    idSignatureElm.innerHTML = '';
                    submitSectionElm.style.display = 'none';

                }
            };
        });

        return formElm;
    };

    window.savePGPIdentitySettings = function(e) {
        switch(e.target.getAttribute('name')) {
            case 'auto_identify':
                var autoSetting = e.target.value;
                console.info(autoSetting, e.target, e);
                break;

            default:
                console.error("Invalid settings target: ", e.target, e);
        }
    };

    window.clickPGPIdentityCustomCacheTime = function(e) {
        console.log(e);
    };

    window.submitPGPIdentifyForm = function(e) {
        e.preventDefault();
        var formElm = e.target.form ? e.target.form : e.target;
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
                message:  "IDENTIFY " + idSigString, // commandString, //
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

    };

    window.changePGPManageFormKeyPassphrase = function(e, keyID) {
        var formElm = window.focusPGPManageForm(e);

    };

    window.submitPGPManageForm = function(e) {
        e.preventDefault();
        var formElm = window.focusPGPManageForm(e);

    };




    function setStatus(formElm, statusText, append) {
        var statusElm = formElm.querySelector('.status-box');
        if(!statusElm) {
            statusElm = document.createElement('div');
            statusElm.setAttribute('class', 'status-box');
            formElm.firstChild ? formElm.insertBefore(statusElm, formElm.firstChild) : formElm.appendChild(statusElm);
        } else {
            statusElm.style.display= 'block';
        }
        if(append)
            statusElm.innerHTML += (statusElm.innerHTML ? '<br/>' : '') + statusText;
        else
            statusElm.innerHTML = statusText;
    }

    // Auto focus

    var focusRequiredElms = document.getElementsByClassName('pgp-idsig-required');
    var onLog = function(e) {
        for(var i=focusRequiredElms.length-1; i>=0; i--) (function(focusRequiredElm) {
            focusRequiredElm.classList.remove('pgp-idsig-required');
            setTimeout(function () {
                window.focusPGPIdentifyForm(e, focusRequiredElm.form);
            }, 400);
        })(focusRequiredElms[i])
    };
    document.addEventListener('log', onLog);
    setTimeout(onLog, 500);


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
})();


//var keys = (new openpgp.Keyring.localstore()).loadPrivate();


//var pgpMessage = openpgp.message.readArmored(encryptedMessage);
//var encIDs = pgpMessage.getEncryptionKeyIds();

(function() {
    var SCRIPT_PATH = 'cmd/pgp/lib/openpgpjs/openpgp.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);

        var timeout = setInterval(function() {
            var src = SCRIPT_PATH.replace('/openpgp.', '/openpgp.worker.');
            if(!window.openpgp || window.openpgp._worker_init)
                return;
            window.openpgp.initWorker(src);
            window.openpgp._worker_init = true;
            clearInterval(timeout);
//             console.info("OpenPGP Worker Loaded: " + src);
        }, 500);
    }
})();


// For Public/Private Key Database access

(function() {
    var SCRIPT_PATH = 'cmd/pgp/pgp-db.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();

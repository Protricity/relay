/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var REFRESH_TIMEOUT = 200;
    var PATH_PREFIX = 'pgp:';
    var CONFIG_ID = 'pgp';
    var AUTO_IDENTIFY_TIMEOUT = 10;

    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('change', onFormEvent);
    self.addEventListener('input', onFormEvent);
    self.addEventListener('log', function(e) {
        return onFormEvent(e, e.target.querySelector('form'));
    });


    var lastIDSIG = null;

    var cancelReceived = false;
    var autoIdentifyStartTime = null;
    var refreshTimeout = null;
    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'pgp-keygen-form':
                if(e.type === 'submit')
                    submitPGPKeyGenForm();
                return true;

            case 'pgp-register-form':
                refreshPGPRegisterForm();
                if(e.type === 'submit')
                    submitPGPRegisterForm();
                return true;

            case 'pgp-manage-form':
                refreshPGPManageForm();
                if(e.type === 'submit')
                    submitPGPManageForm();
                return true;

            case 'pgp-identify-form':
                if(e.type === 'change')
                    saveAutoIdentify();
                refreshAutoIdentifyForm();
                if(e.type === 'submit')
                    submitPGPIdentifyForm();

                return true;

            case 'pgp-identify-success-form':
                saveAutoIdentify();
                //if(e.type === 'submit') { TODO:
                return true;

            default:
                return false;
        }


        // Event Handlers

        function submitPGPKeyGenForm() {
            e.preventDefault();
            var bits = val('bits');
            var userID = val('user_id');
            var passphrase = val('passphrase');
            var send_as_socket_command = parseInt(val('send_as_socket_command'));

            formElm.querySelector('[type=submit]').setAttribute('disabled', 'disabled');
    //0 &&
            if(send_as_socket_command) {
                setStatus("Generating new PGP Key via socket command...");
                var commandString = 'KEYGEN --bits ' + bits;
                if(passphrase)
                    commandString += ' --passphrase ' + passphrase;
                commandString += ' --user ' + userID;

                var messageEvent = new CustomEvent('socket', {
                    detail: commandString
                });
                document.dispatchEvent(messageEvent);

            } else {
                setStatus("Generating new PGP Key via client...");



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

        function refreshPGPRegisterForm() {
            var submitElm = formElm.querySelector('input[type=submit]');
            if(input('private_key').indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1) {
                submitElm.setAttribute('disabled', 'disabled');
            } else {
                submitElm.removeAttribute('disabled');
            }
        }

        function submitPGPRegisterForm() {
            e.preventDefault();
            var privateKeyValue = val('private_key');

            if(privateKeyValue.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1)
                throw new Error("PGP PRIVATE KEY BLOCK not found");

            var privateKey = window.openpgp.key.readArmored(privateKeyValue).keys[0];

            var messageEvent = new CustomEvent('socket', {
                detail: "REGISTER " + privateKey.armor(),
                cancelable:true
            });
            document.dispatchEvent(messageEvent);
        }

        function refreshPGPManageForm() {
            var selectedEntryElm = formElm.querySelectorAll('.pgp-id-box :checked');
            var spanSelectedKeysElm = formElm.getElementsByClassName('span-action')[0];
            var commandString = val('action');
            if(!commandString)
                return;
            var multiCommand = (commandString[0] === '@' ? (function(){ commandString = commandString.substr(1); return true; })() : false);

            var match = /^(\w+)(?:.(\w+))?([\s\S]+)$/.exec(commandString);
            var action = match[1];

            var keyString = "(" + selectedEntryElm.length + ") Key" + (selectedEntryElm.length === 1 ? '' : 's');
            switch(action) {
                case 'default':
                    spanSelectedKeysElm.innerHTML = "Set Default Identity " + keyString; break;
                case 'passphrase':
                    spanSelectedKeysElm.innerHTML = "Change Passphrase on " + keyString; break;
                case 'sign':
                    spanSelectedKeysElm.innerHTML = "Sign Text with " + keyString; break;
                case 'verify':
                    spanSelectedKeysElm.innerHTML = "Verify Signature with " + keyString; break;
                case 'encrypt':
                    spanSelectedKeysElm.innerHTML = "Encrypt Content with " + keyString; break;
                case 'decrypt':
                    spanSelectedKeysElm.innerHTML = "Decrypt Content " + keyString; break;
                case 'export-public':
                    spanSelectedKeysElm.innerHTML = "Export Public Keys for " + keyString; break;
                case 'export':
                    spanSelectedKeysElm.innerHTML = "<span class='warn'>Export Private Keys</span> for " + keyString; break;
                case 'delete':
                    spanSelectedKeysElm.innerHTML = "Delete " + keyString; break;
                default:
                    spanSelectedKeysElm.innerHTML = "Selected " + keyString; break;
                    break;
            }
        }

        function submitPGPManageForm() {
            e.preventDefault();
            var commandString = val('action');
            if(!commandString)
                return;
            var multiCommand = (commandString[0] === '@' ? (function(){ commandString = commandString.substr(1); return true; })() : false);

            var match = /^(\w+)(?:.(\w+))?([\s\S]+)$/.exec(commandString);
            var action = match[1];
            var subAction = match[2];
            var content = match[3];


            var selectedEntryElms = formElm.querySelectorAll('.pgp-id-box :checked');
            if(selectedEntryElms.length === 0) {
                setStatus("<span class='error'>No IDs selected</span>");
                return;
            }
            setStatus('');
            var selectedPrivateKeyIDs = [];
            for(var i=selectedEntryElms.length-1; i>=0; i--) (function(selectedEntryElm) {
                selectedPrivateKeyIDs.push(selectedEntryElm.getAttribute('value'));
            })(selectedEntryElms[i]);

            for(i=selectedEntryElms.length-1; i>=0; i--) {
                commandString = commandString
                    .replace(/{\$id_private_list}/gi, selectedPrivateKeyIDs.join(', '))
                    .replace(/{\$id_private}/gi, selectedPrivateKeyIDs[i]);

                var commandEvent = new CustomEvent('command', {
                    detail: commandString,
                    cancelable: true,
                    bubbles: true
                });
                document.dispatchEvent(commandEvent);
                if (commandEvent.defaultPrevented) {
                    setStatus("<span class='success'>Command sent: </span><span class='command'>" + commandString + "</span>", true);
                    for (i = selectedEntryElms.length - 1; i >= 0; i--)
                        selectedEntryElms[i].checked = false;
                } else {
                    setStatus("<span class='error'>Command not sent: </span><span class='command'>" + commandString + "</span>", true);

                }

                if(!multiCommand)
                    break;
            }
        }

        //clearTimeout(refreshTimeout);
        //refreshTimeout = setTimeout(function() {

        function refreshAutoIdentifyForm() {
            if(autoIdentifyStartTime && ['change', 'input'].indexOf(e.type) !== -1) {
                var elapsedSeconds = parseInt(new Date().getTime() / 1000 - autoIdentifyStartTime);
                if(elapsedSeconds > 2) {
                    cancelReceived = true;
                    console.info("Cancel received by ", e.target);
                }
            }

            var compact = val('username').length + val('pgp_id_private').length === 0;
            formElm.classList[compact ? 'add' : 'remove']('compact');

            clearTimeout(refreshTimeout);
            if(val('pgp_id_private')) {
                refreshTimeout = setTimeout(function () {
                    getPrivateKeyDataFromForm(function (err, privateKeyData, pgp_id) {
                        if (err)
                            throw new Error(err);
                        if (!privateKeyData)
                            throw new Error("Private Key Not Found: " + pgp_id);
                        gen(privateKeyData);
                    });
                }, REFRESH_TIMEOUT);
            }

            function gen(privateKeyData) {
                var privateKey = openpgp.key.readArmored(privateKeyData.block_private).keys[0];

                var usernameElm = input('username');
                if(!usernameElm.value || usernameElm.getAttribute('data-default') === usernameElm.value) {
                    var defaultUsername = privateKey.getUserIds()[0].trim().split(/@/, 2)[0].replace(/[^a-zA-Z0-9_-]+/ig, ' ').trim().replace(/\s+/g, '_');
                    usernameElm.value = defaultUsername;
                    usernameElm.setAttribute('data-default', defaultUsername);
                }

                var pgp_id_public = privateKeyData.id_public;
                var visibility = (function() {
                    var visibility = '';
                    var visibilityElm = input('visibility');
                    for(var vi=0; vi<visibilityElm.length; vi++)
                        if(visibilityElm[vi].selected)
                            visibility = (visibilityElm[vi].value[0] !== '_' ? visibility : '') + visibilityElm[vi].value.replace('_', '');
                    return visibility;
                })();
                var session_uid = val('session_uid');
                var username = val('username');
                if(/\s/.test(username))
                    input('username').value = username = username.replace(/\s+/, '_');

                var identityString = "IDSIG" +
                    " " + pgp_id_public +
                    " " + session_uid +
                    " " + username +
                    " " + visibility;

                var doSign = false;
                if(!input('id_signature').innerHTML || !lastIDSIG || identityString !== lastIDSIG) {
                    lastIDSIG = identityString;
                    doSign = true;
                    setStatus("<span class='info'>Clearing signed data...</span>");
                }


                formElm.classList[privateKey.primaryKey.isDecrypted ? 'remove' : 'add']('passphrase-required');
                input('passphrase')[(privateKey.primaryKey.isDecrypted ? 'remove' : 'set') + 'Attribute']('required', 'required');

                if(!privateKey.primaryKey.isDecrypted) {
                    var passphrase = val('passphrase');
                    if (passphrase) {
                        privateKey.primaryKey.decrypt(passphrase);
                    }
                }

                if(!privateKey.primaryKey.isDecrypted)
                    doSign = false;

                if(!doSign) {
                    setStatus("<span class='passphrase'>PGP Passphrase required</span>", true);

                } else {
                    setStatus("Signing Identity...", true);
                    openpgp.signClearMessage(privateKey, identityString)
                        .then(function (signedIDString) {

                            setStatus("<span class='success'>" + "Signature successful. Ready to IDENTIFY!" + "</span>");
                            input('id_signature').innerHTML = signedIDString.trim() +
                            "\n" + privateKeyData.block_public;

                            if (formElm.classList.contains('auto-identify')) {
                                formElm.classList.remove('auto-identify');
                                autoIdentifyStartTime = new Date().getTime() / 1000;
                                var interval = setInterval(function () {
                                    if (cancelReceived) {
                                        clearInterval(interval);
                                        setStatus("<span class='error'>" + "Auto-Identify Canceled" + "</span>", 5);
                                        formElm.classList.add('auto-identify-attempted');
                                        return;
                                    }
                                    var elapsedSeconds = parseInt(new Date().getTime() / 1000 - autoIdentifyStartTime);
                                    var secondsLeft = AUTO_IDENTIFY_TIMEOUT - elapsedSeconds;
                                    setStatus("<span class='pending'>" + "Auto-Identifying in " + (secondsLeft) + " second" + (secondsLeft === 1 ? "" : "s") + "...</span>", 1);

                                    if (elapsedSeconds < AUTO_IDENTIFY_TIMEOUT)
                                        return;

                                    clearInterval(interval);
                                    submitPGPIdentifyForm();

                                }, 1000);
                            }
                        });
                }
            }

            return formElm;
        }

        function getPrivateKeyDataFromForm(callback) {
            PGPDB(function (db) {
                var pgpIDPrivateElm = input('pgp_id_private');
                var pgpIDPublicElm = input('pgp_id_public');

                var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
                var privateKeyDBStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);
                var index = privateKeyDBStore;
                if(!pgpIDPrivateElm && !pgpIDPublicElm)
                    throw new Error("No public or private pgp id in form");
                var pgp_id;
                if(pgpIDPublicElm && pgpIDPublicElm.value) {
                    pgp_id = pgpIDPublicElm.value;
                    index = privateKeyDBStore.index('id_public');
                } else if(pgpIDPrivateElm && pgpIDPrivateElm.value) {
                    pgp_id = pgpIDPrivateElm.value;
                } else {
                    callback("No public or private pgp id in form", null, pgp_id);
                    return;
                    //throw new Error("No public or private pgp id in form");
                }
                pgp_id = pgp_id.substr(pgp_id.length - 16);
                var req = index.get(pgp_id);
                req.onerror = function (err) {
                    callback(err, null, pgp_id);
                };
                req.onsuccess = function (evt) {
                    var privateKeyData = evt.target.result;
                    callback(null, privateKeyData, pgp_id);
                };
            });
        }

        function saveAutoIdentify() {
            var autoIdentifyElm = input('auto_identify');
            var autoIdentifyLastValue = autoIdentifyElm.getAttribute('data-last-value');
            autoIdentifyElm.setAttribute('data-last-value', autoIdentifyElm.value);
            if(!autoIdentifyElm.value || autoIdentifyLastValue === autoIdentifyElm.value)
                return false;

            function saveWithKeyID(pgp_id_private) {
                var socket_host = val('socket_host');
                if(!socket_host)
                    throw new Error("Invalid Socket Host in form field 'socket_host'");

                var newConfigData = {'id': CONFIG_ID};
                newConfigData['autoIdentify'] = null;
                newConfigData['autoIdentifyHost:' + socket_host] = null;

                var status = '';
                switch(autoIdentifyElm.value) {
                    case 'ask':
                        status = 'Auto Identify disabled';
                        break;

                    case 'auto-host':
                        status = 'Auto Identify set for host [' + socket_host + '] using private key [' + pgp_id_private + ']';
                        newConfigData['autoIdentifyHost:' + socket_host] = pgp_id_private;
                        break;

                    case 'auto-all':
                        status = 'Auto Identify set for all hosts using private key [' + pgp_id_private + ']';
                        newConfigData['autoIdentify'] = pgp_id_private;
                        break;

                    default:
                        throw new Error("Invalid auto_identify option: " + autoIdentifyElm.value);
                }

                ConfigDB.addConfigToDatabase(newConfigData);
                setStatus("<span class='info'>" + status + "</span>", 5, true);
                console.info(status);
            }

            getPrivateKeyDataFromForm(function(err, privateKeyData, pgp_id) {
                if(err)
                    throw new Error(err);
                if(!privateKeyData)
                    throw new Error("Could not find private key: " + pgp_id);
               saveWithKeyID(privateKeyData.id_private);
            });
            return true;
        }

        function submitPGPIdentifyForm() {
            cancelReceived = true;
            e.preventDefault();
            var idSignatureElm = input('id_signature');
            var passphraseElm = input('passphrase');

            var visibilityElm = formElm.querySelector('[name=visibility]');
            var visibility = '';
            for(var vi=0; vi<visibilityElm.length; vi++)
                if(visibilityElm[vi].selected)
                    visibility = (visibilityElm[vi].value[0] !== '_' ? visibility : '') + visibilityElm[vi].value.replace('_', '');

            var commandString = "IDSIG " + idSignatureElm.value;
            if(commandString.indexOf("-----BEGIN PGP SIGNED MESSAGE-----") === -1)
                throw new Error("BEGIN PGP SIGNED MESSAGE not found");

            var messageEvent = new CustomEvent('socket', {
                detail: commandString,
                cancelable:true
            });
            document.dispatchEvent(messageEvent);
            formElm.classList.add('form-success');
            idSignatureElm.innerHTML = '';
            passphraseElm.value = '';
            setStatus("<span class='success'>IDSIG Sent Successfully</span>");

        }

        function setStatus(statusText, prepend, unique) {
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

        function input(name) { return formElm.querySelector('[name=' + name + ']'); }
        function val(name) {
            return (input(name) || (function() {
                throw new Error("Could not find form[" + formElm.getAttribute('name') + "] input: " + name);
            })()).value;
        }

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

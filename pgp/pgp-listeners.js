/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var REFRESH_TIMEOUT = 500;
    var PATH_PREFIX = 'pgp:';
    var CONFIG_ID = 'pgp';
    var AUTO_IDENTIFY_TIMEOUT = 10;

    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('change', onFormEvent);
    self.addEventListener('input', onFormEvent);
    self.addEventListener('log', function(e) {
        //console.log(e.type, e.target.querySelector('form'), e.target);
        return onFormEvent(e, e.target.querySelector('form'));
    });
    //setTimeout(function() {
    //    var forms = document.querySelectorAll('form[name=pgp-identify-form]');
    //    console.log(forms);
    //    for(var i=forms.length-1; i>=0 ;i--)
    //        onFormEvent({}, forms[i]);
    //}, 400);


    var lastIDSIG = null;

    var cancelReceived = false;
    var autoIdentifyStartTime = null;
    var generateIDSigTimeout = null;
    var autoIdentifyRefreshInterval = null;
    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'pgp-keygen-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitPGPKeyGenForm();
                return true;

            case 'pgp-register-form':
                refreshPGPRegisterForm();
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitPGPRegisterForm();
                return true;

            case 'pgp-manage-form':
                refreshPGPManageForm();
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitPGPManageForm();
                return true;

            case 'pgp-identify-form':
                if(e.type === 'change')
                    saveAutoIdentify();
                refreshIdentifyForm();
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitPGPIdentifyForm();

                return true;

            case 'pgp-identify-success-form':
                if(e.type === 'change')
                    saveAutoIdentify();
                //if(e.type === 'submit') { TODO:
                return true;

            default:
                return false;
        }


        // Event Handlers

        function submitPGPKeyGenForm() {
            var bits = val('bits');
            var userID = val('user_id');
            var passphrase = val('passphrase');
            //var send_as_socket_command = parseInt(val('send_as_socket_command'));

            formElm.querySelector('[type=submit]').setAttribute('disabled', 'disabled');
            setStatus("Generating new PGP Key via client...");

            openpgp.generateKeyPair({
                keyType:1,
                numBits:bits,
                userId:userID,
                passphrase:passphrase

            }).then(function(keyPair) {
                var newPrivateKeyID = keyPair.key.primaryKey.getKeyId().toHex().toUpperCase();
                var newPublicKeyID = keyPair.key.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                console.log("New PGP Key Generated: ", newPrivateKeyID, newPublicKeyID);

                var messageEvent = new CustomEvent('socket', {
                    detail: "REGISTER " + keyPair.privateKeyArmored,
                    cancelable:true
                });
                document.dispatchEvent(messageEvent);

            });

            //}
    //0 &&
    //        if(send_as_socket_command) {
    //            setStatus("Generating new PGP Key via socket command...");
    //            var commandString = 'KEYGEN --bits ' + bits;
    //            if(passphrase)
    //                commandString += ' --passphrase ' + passphrase;
    //            commandString += ' --user ' + userID;
    //
    //            var messageEvent = new CustomEvent('socket', {
    //                detail: commandString
    //            });
    //            document.dispatchEvent(messageEvent);
    //
    //        } else {

        }

        function refreshPGPRegisterForm() {
            var submitElm = formElm.querySelector('input[type=submit]');
            submitElm.setAttribute('disabled', 'disabled');
            submitElm.setAttribute('value', "Register");

            if(val('private_key').indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") >= 0) {
                var privateKey = window.openpgp.key.readArmored(val('private_key')).keys[0];
                self.wut = privateKey;
                var privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();

                var publicKey = privateKey.toPublic();
                var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                //var publicKeyBlock = publicKey.armor();

                var userIDString = privateKey.getUserIds().join('; ');
                formElm.getElementsByClassName('status-box')[0].innerHTML = "\
                    <span class='success'>Private Key Block read successfully</span><br/>\n\
                    Private Key ID: <strong>" + privateKeyID + "</strong><br/>\n\
                    Public Key ID: <strong>" + publicKeyID + "</strong><br/>\n\
                    User ID: <strong>" + userIDString.replace(/</, '&lt;') + "</strong><br/>\n\
                    Passphrase: <strong>" + (privateKey.primaryKey.isDecrypted ? 'No' : 'Yes') + "</strong><br/>";

                submitElm.removeAttribute('disabled');
                submitElm.setAttribute('value', "Register '" + userIDString.replace(/</, '&lt;') + "'");
            }
        }

        function submitPGPRegisterForm() {
            var privateKeyValue = val('private_key');

            if(privateKeyValue.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1)
                throw new Error("PGP PRIVATE KEY BLOCK not found");

            var privateKey = window.openpgp.key.readArmored(privateKeyValue).keys[0];
            var privateKeyBlock = privateKey.armor();
            var privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();

            var publicKey = privateKey.toPublic();
            var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            var publicKeyBlock = publicKey.armor();

            var userIDString = privateKey.getUserIds().join('; ');

            var path = '/.private/id';
            KeySpaceDB.addVerifiedContentToDB(privateKeyBlock, publicKeyID, path, Date.now(), function(err, insertData) {
                if(err)
                    throw new Error(err);


                var path = '/public/id';
                KeySpaceDB.addVerifiedContentToDB(publicKeyBlock, publicKeyID, path, Date.now(), function(err, insertData) {
                    if(err)
                        throw new Error(err);

                    var messageEvent = new CustomEvent('socket', {
                        detail: "MANAGE",
                        cancelable:true
                    });
                    document.dispatchEvent(messageEvent);
                    Client.manage("MANAGE");
                });

            });

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

        function refreshIdentifyForm() {
            //if(formElm.classList.contains('form-success'))
            //    return;

            var pgpIDElm = input('pgp_id_private');
            if(!pgpIDElm.value) {
                formElm.classList.add('id-required');
                return;
            }
            formElm.classList.remove('id-required');
            var split = pgpIDElm.value.split(',');
            var pgp_id_private = split[0];
            var pgp_id_public = split[1];
            var defaultUsername = split[2];
            var passphraseRequired = split[3] === '1';

            var usernameElm = input('username');
            if(!usernameElm.value || usernameElm.getAttribute('data-default') === usernameElm.value) {
                usernameElm.value = defaultUsername;
                usernameElm.setAttribute('data-default', defaultUsername);
            }

            if(passphraseRequired) {
                formElm.classList.add('passphrase-required');
                formElm.classList.remove('passphrase-success');
                input('passphrase').setAttribute('required', 'required');

            } else {
                formElm.classList.remove('passphrase-required');
                formElm.classList.add('passphrase-success');
                input('passphrase').removeAttribute('required');
            }

            var visibility = (function() {
                var visibility = '';
                var visibilityElm = input('visibility');
                for(var vi=0; vi<visibilityElm.length; vi++)
                    if(visibilityElm[vi].selected)
                        visibility = (visibilityElm[vi].value[0] !== '_' ? visibility : '') + visibilityElm[vi].value.replace('_', '');
                return visibility;
            })();
            if(/\s/.test(usernameElm.value))
                usernameElm.value = usernameElm.value.replace(/\s+/, '_');

            var identityString = "IDSIG" +
                " " + pgp_id_public +
                " " + val('session_uid') +
                " " + usernameElm.value +
                " " + visibility;

            if(identityString !== lastIDSIG) {
                lastIDSIG = identityString;
                setStatus("<span class='info'>Clearing signed data...</span>");
                input('id_signature').innerHTML = '';
            }

            if(!input('id_signature').innerHTML) {

                clearTimeout(generateIDSigTimeout);
                generateIDSigTimeout = setTimeout(gen, REFRESH_TIMEOUT);

                if(autoIdentifyRefreshInterval) {
                    clearTimeout(autoIdentifyRefreshInterval);
                    autoIdentifyRefreshInterval = null;
                    console.info("Cancel received by ", e.target);
                    setStatus("<span class='error'>" + "Auto-Identify Canceled" + "</span>");
                    formElm.classList.add('auto-identify-attempted');
                    formElm.classList.remove('auto-identifying');
                }
            }


            function gen() {
                PGPDB(function (db) {
                    var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readonly");
                    var privateKeyDBStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);
                    pgp_id_private = pgp_id_private.substr(pgp_id_private.length - 16);
                    var req = privateKeyDBStore.get(pgp_id_private);
                    req.onsuccess = function (evt) {
                        var privateKeyData = evt.target.result;
                        if(!privateKeyData)
                            throw new Error("Private Key not found: " + pgp_id_private);

                        var privateKey = openpgp.key.readArmored(privateKeyData.block_private).keys[0];

                        if(!privateKey.primaryKey.isDecrypted)
                                privateKey.primaryKey.decrypt(val('passphrase'));

                        if(!privateKey.primaryKey.isDecrypted) {
                            //setStatus("<span class='passphrase'>PGP Passphrase required</span>", true);
                            formElm.classList.remove('passphrase-success');

                        } else {
                            formElm.classList.add('passphrase-success');
                            setStatus("Signing Identity...", true);
                            openpgp.signClearMessage(privateKey, identityString)
                                .then(function (signedIDString) {

                                    setStatus("<span class='success'>" + "Signature successful. Ready to IDENTIFY!" + "</span>");
                                    input('id_signature').innerHTML = signedIDString.trim() +
                                        "\n" + privateKeyData.block_public;
                                    formElm.classList.remove('idsig-required');

                                    if (formElm.classList.contains('auto-identify')) {
                                        formElm.classList.remove('auto-identify');
                                        formElm.classList.add('auto-identifying');
                                        autoIdentifyStartTime = new Date().getTime() / 1000;
                                        clearInterval(autoIdentifyRefreshInterval);
                                        autoIdentifyRefreshInterval = setInterval(function () {
                                            var elapsedSeconds = parseInt(new Date().getTime() / 1000 - autoIdentifyStartTime);
                                            var secondsLeft = AUTO_IDENTIFY_TIMEOUT - elapsedSeconds;
                                            setStatus("<span class='pending'>" + "Auto-Identifying in " + (secondsLeft) + " second" + (secondsLeft === 1 ? "" : "s") + "...</span>");

                                            if (elapsedSeconds < AUTO_IDENTIFY_TIMEOUT)
                                                return;

                                            formElm.classList.remove('auto-identifying');
                                            formElm.classList.add('auto-identify-attempted');
                                            clearInterval(autoIdentifyRefreshInterval);

                                            if(input('id_signature').innerHTML)
                                                submitPGPIdentifyForm();
                                            else
                                                console.error("IDSIG was empty. Skipped Submit");

                                        }, 1000);
                                    }
                                });
                        }
                    }

                });
            }
        }

        function submitPGPIdentifyForm() {
            cancelReceived = true;
            var idSignatureElm = input('id_signature');
            var passphraseElm = input('passphrase');

            var visibilityElm = formElm.querySelector('[name=visibility]');
            var visibility = '';
            for(var vi=0; vi<visibilityElm.length; vi++)
                if(visibilityElm[vi].selected)
                    visibility = (visibilityElm[vi].value[0] !== '_' ? visibility : '') + visibilityElm[vi].value.replace('_', '');

            if(idSignatureElm.value.indexOf("-----BEGIN PGP SIGNED MESSAGE-----") === -1)
                throw new Error("BEGIN PGP SIGNED MESSAGE not found");
            var commandString = "IDSIG " + idSignatureElm.value;

            var messageEvent = new CustomEvent('socket', {
                detail: commandString,
                cancelable:true
            });
            document.dispatchEvent(messageEvent);
            formElm.classList.add('form-success');
            //formElm.classList.add('idsig-required');
            idSignatureElm.innerHTML = '';
            passphraseElm.value = '';
            setStatus("<span class='success'>IDSIG Sent Successfully</span>");

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

            var pgpIDElm = input('pgp_id_private');
            if(!pgpIDElm.value)
                return;

            var split = pgpIDElm.value.split(',');
            var pgp_id_private = split[0];
            var pgp_id_public = split[1];
            var defaultUsername = split[2];
            var passphraseRequired = split[3] === '1';

            var autoIdentifyElm = input('auto_identify');
            if(!autoIdentifyElm.value || autoIdentifyElm.getAttribute('data-last-value') === autoIdentifyElm.value)
                return false;
            autoIdentifyElm.setAttribute('data-last-value', autoIdentifyElm.value);

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
            return true;
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

    // For HTTP Content Database access
    includeScript('ks/ks-db.js');

    // For PGP Decryption in chat rooms
    var openPGPScriptPath = 'pgp/lib/openpgpjs/openpgp.js';
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

//
//    var SCRIPT_PATH = 'pgp/lib/openpgpjs/openpgp.js';
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

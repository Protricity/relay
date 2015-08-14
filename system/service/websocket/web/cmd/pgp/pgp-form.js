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

        if(0 && send_as_socket_command) {
            setStatus(formElm, "Generating new PGP Key via socket command...");
            var commandString = 'KEYGEN --bits ' + bits;
            if(passphrase)
                commandString += ' --passphrase ' + passphrase;
            commandString += ' --user ' + userID;

            var messageEvent = new CustomEvent('socket', {
                detail: commandString,
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

        //
        //
        //var local = new openpgp.Keyring.localstore();
        //var keys = local.loadPrivate();
        //for(var ki=0; ki<keys.length; ki++) {
        //    if (keys[ki].getKeyIds()[0].toHex() === privateKeyID) {
        //        setStatus(formElm, "<div class='error'>Private key already exists</div>");
        //        throw new Error("Private key already exists");
        //
        //    }
        //    if (keys[ki].getUserIds()[0] === privateUserID) {
        //        if(!confirm("User ID already exists: " + privateUserID
        //            + "\nWould you like to continue registering the duplicate?"
        //            + "\n(OK=register, Cancel=abort)")) {
        //            setStatus(formElm, "<div class='error'>Aborted due to duplicate user id value</div>");
        //            throw new Error("Aborted due to duplicate user id value");
        //        }
        //    }
        //}
        //
        //keys.push(privateKey);
        //local.storePrivate(keys);
        //
        //privateKeyElm.value = '';
        //formElm = focusPGPRegisterForm(e);
        //
        //var messageEvent = new CustomEvent('socket', {
        //    detail: "MANAGE " + privateKeyID,
        //    cancelable:true,
        //    bubbles:true
        //});
        //document.dispatchEvent(messageEvent);
        //
        //setTimeout(function () {
        //    var formElms = document.querySelectorAll('form[name=pgp-manage-form]');
        //    for(var fi=0; fi<formElms.length; fi++)
        //        window.focusPGPManageForm(e, formElms[fi]);
        //}, 100);
        //
        //setStatus(formElm, "New PGP Key Registered: " + privateKeyID);
    };

    var loadedForms = [];
    window.focusPGPManageForm = function(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Not a Form: " + formElm.nodeName);
        if(formElm.getAttribute('name') !== 'pgp-manage-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));

        var pgpDivs = formElm.getElementsByClassName('pgp-id-box');
        if(pgpDivs.length === 0 || loadedForms.indexOf(formElm) >= 0)
            return formElm;

        // Remove current boxes
        while(pgpDivs.length>0)
            pgpDivs[0].parentNode.removeChild(pgpDivs[0]);

        var local = new openpgp.Keyring.localstore();
        var keys = local.loadPrivate();

        for(var ki=0; ki<keys.length; ki++) {
            var key = keys[ki];
            var keyID = key.getKeyIds()[0].toHex();
            var userID = key.getUserIds().join('; ');

            var pgpHTML = '<fieldset class="pgp-id-box pgp-id-box:' + keyID + '">';
            pgpHTML += '<legend>PGP Private Key</legend>';
            pgpHTML += '<label><strong>Key ID:&nbsp;&nbsp;&nbsp;&nbsp;</strong> ' + keyID + '</label><br/>';
            pgpHTML += '<label><strong>User ID:&nbsp;&nbsp;&nbsp;</strong> ' + userID + '</label><br/>';
            pgpHTML += '<label><strong>Passphrase:</strong> ' + (key.primaryKey.isDecrypted ? 'No' : 'Yes') + '</label><br/>';
            pgpHTML += '<label><strong>Actions:&nbsp;&nbsp;&nbsp;</strong> ';
            pgpHTML += '<select name="actions" onselect="window[this.value](event, \'' + keyID + '\'); " oninput="window[this.value](event, \'' + keyID + '\'); ">';
            pgpHTML += '<option value="" selected="selected">Select action</option>';
            pgpHTML += '<option value="changePGPManageFormKeyPassphrase"' + (!key.primaryKey.isDecrypted ? ' disabled="disabled"' : '') + '>Change Password</option>';
            pgpHTML += '<option value="changePGPManageFormKeyPassphrase"' + (key.primaryKey.isDecrypted ? ' disabled="disabled"' : '') + '>Add Password</option>';

            pgpHTML += '<option value="" disabled="disabled">Sign/Encrypt Text</option>';
            pgpHTML += '<option value="deletePGPManageFormKey">Delete Key</option>';
            pgpHTML += '</select>';
            pgpHTML += '</label><br/>';
            pgpHTML += '</fieldset>';
            formElm.innerHTML += pgpHTML;
        }

        setStatus(formElm, "Found " + keys.length + " PGP Private Keys");

        loadedForms.push(formElm);
        return formElm;
    };

    window.deletePGPManageFormKey = function(e, deleteKeyID) {
        var formElm = window.focusPGPManageForm(e);

        var local = new openpgp.Keyring.localstore();
        var keys = local.loadPrivate();

        for(var ki=0; ki<keys.length; ki++) {
            var key = keys[ki];
            var keyID = key.getKeyIds()[0].toHex();
            var userID = key.getUserIds().join('; ');
            if(deleteKeyID !== keyID)
                continue;

            if(!confirm("Are you sure you want to delete this key?\n[" + userID + ']'))
                return false;

            keys.splice(ki, 1);
            local.storePrivate(keys);

            var pgpDivs = formElm.getElementsByClassName('pgp-id-box:' + keyID);
            while(pgpDivs.length>0)
                pgpDivs[0].parentNode.removeChild(pgpDivs[0]);
            setStatus(formElm, "PGP Key deleted: " + keyID);
            return true;
        }

        throw new Error("Could not find key id: " + deleteKeyID);
    };

    window.changePGPManageFormKeyPassphrase = function(e, keyID) {
        var formElm = window.focusPGPManageForm(e);

    };

    window.submitPGPManageForm = function(e) {
        e.preventDefault();
        var formElm = window.focusPGPManageForm(e);

    };

    function keyGenCommand(e, keyGenString) {
        var userID = keyGenString;
        //var passphrase = prompt("Optionally add a passphrase to secure your new identity keys. You will be asked for this whenever your private key is used");
        //sendResponse("LOG ~ New Keypair Generated: " + newKeyID);

        e.preventDefault();
        sendResponse("LOG pgp:keygen " + KEYGEN_TEMPLATE
            .replace(/{\$user_id}/gi, '')
            .replace(/{\$private_key}/gi, '')
        );
    }

    function encryptCommand(e, contentString) {


        var keys = (new openpgp.Keyring.localstore()).loadPrivate();
        var privateKey = null;
        for(var ki=0; ki<keys.length; ki++) {

        }

        if(!privateKey)
            throw new Error("No private key found");

        var encryptedContent = openpgp.encryptMessage(privateKey, contentString);

        e.preventDefault();
        sendResponse("LOG ~ " + encryptedContent);
    }

    function sendResponse(responseString) {

        var messageEvent = new CustomEvent('message', {
            detail: responseString,
            cancelable:true,
            bubbles:true
        });
        document.dispatchEvent(messageEvent);
        //if(messageEvent.defaultPrevented)
        //    messageElm[0].value = '';
        return false;
    }

    function nl2br (str, is_xhtml) {
        var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
        return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
    }

    function setStatus(formElm, statusText) {
        var statusElm = formElm.querySelector('.status-box');
        if(!statusElm) {
            statusElm = document.createElement('div');
            statusElm.setAttribute('class', 'status-box');
            formElm.firstChild ? formElm.insertBefore(statusElm, formElm.firstChild) : formElm.appendChild(statusElm);
        } else {
            statusElm.style.display= 'block';
        }
        statusElm.innerHTML = statusText;
        console.log(statusText);
    }
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
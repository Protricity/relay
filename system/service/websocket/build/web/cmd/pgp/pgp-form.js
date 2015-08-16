/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'pgp:';

    var selectedPublicKeyID = null;

    var decryptionRequiredElms = document.getElementsByClassName('decryption-required');
    var verificationRequiredElms = document.getElementsByClassName('verification-required');
    document.addEventListener('log', function(e) {
        var htmlContainer = e.target;
        console.log("Needs decryption: ", htmlContainer, verificationRequiredElms);
//         if(htmlContainer.getElementsByClassName(CLASS_FEED_POST).length > 0) // TODO: ugly/inefficient
//            updateUserFeedCache(htmlContainer);
    });


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
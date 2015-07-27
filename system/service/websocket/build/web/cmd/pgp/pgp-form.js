/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var PATH_PREFIX = 'pgp:';


    //document.addEventListener('command', onCommandEvent);

    var selectedPublicKeyID = null;

    function setStatus(formElm, statusText) {
        var statusElms = formElm.querySelectorAll('.status-box');
        if(statusElms.length === 0) {
            var newStatus = document.createElement('div');
            newStatus.setAttribute('class', 'status-box');
            formElm.appendChild(newStatus);
        }
        statusElms[0].innerHTML = statusText;
        console.log(statusText);
    }

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

        formElm.querySelector('*[type=submit]').setAttribute('disabled', 'disabled');

        setStatus(formElm, "Generating new PGP Key...");

        openpgp.generateKeyPair({
            keyType:1,
            numBits:bits,
            userId:userID,
            passphrase:passphrase

        }).then(function(NewKey) {
            var newKeyID = NewKey.key.getKeyIds()[0].toHex();
            console.log("New PGP Key Generated: " + newKeyID);

            var messageEvent = new CustomEvent('socket', {
                detail: "REGISTER " + NewKey.privateKeyArmored,
                cancelable:true,
                bubbles:true
            });
            document.dispatchEvent(messageEvent);

            setTimeout(function(e) {
                var formElm = document.querySelector('form[name=pgp-register-form]');
                var privateKeyElm = formElm.querySelector('textarea[name=private_key]');
                privateKeyElm.value = NewKey.privateKeyArmored;

                setStatus(formElm, "New PGP Key Generated: " + newKeyID + ".<br/>You may now <span class='action'>register</span> your new private key");
            }, 100);
        });
    };


    function nl2br (str, is_xhtml) {
        var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
        return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
    }

    window.submitPGPRegisterForm = function(e) {
        e.preventDefault();
        var formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Not a Form: " + formElm.nodeName);
        if(formElm.getAttribute('name') !== 'pgp-register-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));

        var private_key = formElm.querySelector('*[name=private_key]').value;

        if(private_key.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1)
            throw new Error("PGP PRIVATE KEY BLOCK not found");

        var privateKey = window.openpgp.key.readArmored(private_key);
        var privateKeyID = privateKey.getKeyIds()[0].toHex();

        var local = new openpgp.Keyring.localstore();
        var keys = local.loadPrivate();
        for(var ki=0; ki<keys.length; ki++)
            if(keys[ki].getKeyIds()[0].toHex() === privateKeyID)
                throw new Error("Private key already exists");

        keys.push(privateKey);
        local.storePrivate(keys);

        setStatus(formElm, "New PGP Key Registered: " + privateKeyID);
        //sendResponse("LOG pgp:output New PGP Key Registered: " + privateKeyID);
    };

    //
    //function onCommandEvent(e) {
    //    var commandString = e.detail || e.data;
    //    if(!commandString)
    //        return;
    //
    //    var match = /^(enc|encrypt|pgp --encrypt)\s?(.*)$/i.exec(commandString);
    //    if(match && match[2])
    //        return encryptCommand(e, match[2]);
    //
    //    match = /^(keygen|gen|pgp --keygen)\s?(.*)$/i.exec(commandString);
    //    if(match && match[2])
    //        return keyGenCommand(e, match[2]);
    //}
    //
    function keyGenCommand(e, keyGenString) {
        var userID = keyGenString;
        //var passphrase = prompt("Optionally add a passphrase to secure your new identity keys. You will be asked for this whenever your private key is used");
        //sendResponse("LOG ~ New Keypair Generated: " + newKeyID);

        e.preventDefault();
        sendResponse("LOG pgp:keygen " + KEYGEN_TEMPLATE
            .replace(/{\$user_id}/gi, '')
            .replace(/{\$private_key}/gi, '')
        );
        //
        //openpgp.generateKeyPair({
        //    keyType:1,
        //    numBits:1024,
        //    userId:userID,
        //    passphrase:passphrase
        //
        //}).then(function(NewKey) {
        //
        //    var local = new openpgp.Keyring.localstore();
        //    var keys = local.loadPrivate();
        //    keys.push(NewKey.key);
        //    local.storePrivate(keys);
        //    var newKeyID = NewKey.key.getKeyIds()[0];
        //    selectedPublicKeyID = newKeyID;
        //
        //});
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
            console.info("OpenPGP Worker Loaded: " + src);
        }, 500);
    }
})();
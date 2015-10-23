/**
 * Created by ari on 6/19/2015.
 */

// Client Script
if(typeof document === 'object')
(function() {
    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('input', onFormEvent);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'pgp-keygen-form':
                refreshPGPKeyGenForm(e, formElm);
                if(e.type === 'submit')
                    submitPGPKeyGenForm(e, formElm);
                return true;

            default:
                return false;
        }



    }

    // Event Handlers

    function refreshPGPKeyGenForm(e, formElm) {
        var userID = formElm.querySelector('input[name=user_id]').value;
        var passphraseElm = formElm.querySelector('input[name=passphrase]');
        passphraseElm.removeAttribute('disabled');
        //passphraseElm[userID.length === 0 ? 'setAttribute' : 'removeAttribute']('disabled', 'disabled');
    }

    function submitPGPKeyGenForm(e, formElm) {
        e.preventDefault();
        var bits = formElm.querySelector('select[name=bits]').value;
        var userID = formElm.querySelector('input[name=user_id]').value;
        var passphrase = formElm.querySelector('input[name=passphrase]').value;


        //formElm.querySelector('[type=submit]').setAttribute('disabled', 'disabled');

        formElm.getElementsByClassName('status-box')[0]
            .innerHTML = "Generating new PGP Key...";

        try {
            clientSideKeyGen(bits, userID, passphrase);
            return;
        } catch (e) {

        }
        var commandString = "PGP.KEYGEN";
        if(bits)
            commandString += " --bits " + bits;
        if(userID)
            commandString += " --user " + userID;
        if(passphrase)
            commandString += " --pass " + passphrase;


        var messageEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable:true
        });
        document.dispatchEvent(messageEvent);
    }

    function clientSideKeyGen(bits, userID, passphrase) {

        openpgp.generateKeyPair({
            keyType:1,
            numBits:bits,
            userId:userID,
            passphrase:passphrase

        }).then(function(keyPair) {
            var privateKey = keyPair.key;
            var newPrivateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
            var newPublicKeyID = privateKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            //console.log("TODO FORM with New PGP Key Generated: ", newPrivateKeyID, newPublicKeyID);

            //registerCommand("REGISTER " + keyPair.privateKeyArmored);

            var messageEvent = new CustomEvent('command', {
                detail: "PGP.IMPORT.FORM " + keyPair.privateKeyArmored,
                cancelable:true
            });
            document.dispatchEvent(messageEvent);

            //var userIDString = privateKey.getUserIds().join('; ');
            //
            ////var publicKeyBlock = publicKey.armor();
            //
            //var status_box = "\
            //        <span class='success'>PGP Key Pair generated successfully</span><br/><br/>\n\
            //        <span class='info'>You may now register the following identity:</span><br/>\n\
            //        User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>\n\
            //        Private Key ID: <strong>" + newPrivateKeyID + "</strong><br/>\n\
            //        Public Key ID: <strong>" + newPublicKeyID + "</strong><br/>\n\
            //        Passphrase: <strong>" + (privateKey.primaryKey.isDecrypted ? 'No' : 'Yes') + "</strong><br/>";
            //
            //self.module = {exports: {}};
            //importScripts('pgp/import/render/pgp-import-form.js');
            //var templateExports = self.module.exports;
            //templateExports.renderPGPImportForm(keyPair.privateKeyArmored, status_box, function(html) {
            //    Client.render(html);
            //});
            //return true;

        });
    }



    var SCRIPT_PATH = 'pgp/lib/openpgpjs/openpgp.js';
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

// Worker Script
else
(function() {

    module.exports.renderPGPKeyGenForm = function(user_id, callback) {
        var TEMPLATE_URL = "pgp/keygen/render/pgp-keygen-form.html";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText
            .replace(/{\$user_id}/gi, user_id.replace(/</g, '&lt;'))
        );
        return true;
    };

})();
if (!module) var module = {};
if (!module.exports) module.exports = {};
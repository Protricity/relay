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
/**
 * Passphrase Prompt Window
 * 
 * Provides a Passphrase prompt UI for decrypting partial PGP Private Keys (the ones that require passphrases)
 */
 
(function() {

    // Client Event Listeners
    if(typeof document === 'object')  {
        document.addEventListener('submit', onFormEvent, false);
        //document.addEventListener('keydown', onFormEvent, false);
    }

    // Worker Thread Exports
    if(typeof module === 'object') {
        module.exports.renderKeySpacePassphraseWindow = renderKeySpacePassphraseWindow;
    }

    // Passphrase Window Template URL
    var TEMPLATE_URL = 'keyspace/passphrase/render/ks-passphrase-window.html';

    /**
     * Handles Command: KEYSPACE.PASSPHRASE [passphrase]
     * @param {string} commandString The command string to process 
     * @param {object} e The command Event
     * @param {callback} callback render callback
     **/
    function renderKeySpacePassphraseWindow(commandString, e, callback) {
        var match = /^(?:keyspace\.)?pass(?:phrase)?\s+([a-f0-9]{8,})/i.exec(commandString);
        if (!match)
            throw new Error("Invalid Passphrase request: " + commandString);

        var pgp_id_public = match[1];

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText
                .replace(/{\$pgp_id_public}/g, pgp_id_public)
                //.replace(/{\$url}/gi, url)$passphrase
        );
    }

    /**
     * Handles Form Events
     * @param {object} e The command Event
     * @param {object} [formElm] The form element  
     **/
    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'ks-passphrase-form':
                //passphrase.log(e);
                if(e.type === 'submit')
                    submitPassphraseForm(e, formElm);
                return true;

            default:
                return false;
        }
    }

    function submitPassphraseForm(e, formElm) {
        e.preventDefault();
        formElm = formElm || e.target.form || e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);

        var messageElm = formElm.querySelector('*[name=message], input[type=text], textarea');
        if(!messageElm)
            throw new Error("No message field found");

        if(!messageElm.value)
            return false;

        var commandString = "KEYSPACE.PASSPHRASE " + messageElm.value;
        if(messageElm.value[0] === '/')
            commandString = messageElm.value.substr(1);

        var commandEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(commandEvent);
        if(!commandEvent.defaultPrevented)
            throw new Error("Command event not handled");
        //messageElm.value = '';
        return false;
    }
})();

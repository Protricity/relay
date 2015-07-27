/**
 * Created by ari on 7/2/2015.
 */



function submitPostForm(e) {
    e.preventDefault();
    var formElm = e.target;
    if(formElm.nodeName.toLowerCase() !== 'form')
        throw new Error("Invalid Form: " + formElm);

    var contentElm = formElm.querySelectorAll('*[name=content], input[type=text], textarea');
    if(contentElm.length === 0 || !contentElm[0].value)
        throw new Error("No content field found");

    var channelElm = formElm.querySelectorAll('*[name=channel]');
    if(channelElm.length === 0 || !channelElm[0].value)
        throw new Error("No channel field found");

    var passphraseElm = formElm.querySelector('*[name=passphrase]');

    var commandString = "POST " + channelElm[0].value + ' ' + contentElm[0].value;


    var local = new openpgp.Keyring.localstore();
    var keys = local.loadPrivate();

    if(keys.length === 0)
        throw new Error("No PGP Keypairs found on this browser. Please load or <a href='#REGISTER'>register</a> a new account");

    var decryptedKeys = [];
    var passphraseRequired = false;
    for(var ki=0; ki<keys.length; ki++) {
        var key = keys[ki];
        if(!key.isDecrypted)
            if(passphraseElm.length>0)
                key.decrypt(passphraseElm[0].value);

        if(key.isDecrypted)
            decryptedKeys.push(key);
    }

    if(decryptedKeys.length === 0) {
        if(passphraseElm) {
            passphraseElm.style.display = 'block';
            passphraseElm.focus();
        }
        throw new Error("PGP key pair requires a passphrse");
    }

    // encrypted

    var socketEvent = new CustomEvent('socket', {
        detail: commandString,
        cancelable:true,
        bubbles:true
    });
    formElm.dispatchEvent(socketEvent);
    //if(e.isDefaultPrevented())
    //    messageElm.value = '';
}


(function() {
    var SCRIPT_PATH = 'cmd/pgp/pgp-form.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();
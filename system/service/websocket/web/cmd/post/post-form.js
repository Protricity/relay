/**
 * Created by ari on 7/2/2015.
 */


(function() {
    var MAX_BLOCK_SIZE = 25000;
    var PREFIX_FEED_POSTS_BY_KEY = 'feed-posts-by-key';


    document.addEventListener('log', function(e) {
        var htmlContainer = e.target;
        if(htmlContainer.getElementsByClassName('feed-post').length > 0) // TODO: ugly/inefficient
            updateUserFeedCache();
    });


    function updateUserFeedCache() {

        var LocalStore = new openpgp.Keyring.localstore();
        var privateKeys = LocalStore.loadPrivate();
        var privateKeyIDs = [];
        for(var i=0; i<privateKeys.length; i++) {
            var privateKey = privateKeys[i];
            privateKeyIDs.push(privateKey.getKeyIds()[0].toHex());
        }
        privateKeys = null;

        for(i=0; i<privateKeyIDs.length; i++) {
            var privateKeyID = privateKeyIDs[i];

            var userPosts = document.getElementsByClassName(PREFIX_FEED_POSTS_BY_KEY + ':' + privateKeyID);

            for(var j=0; j<userPosts.length; j++) {
                var userPost = userPosts[j];
                if(userPost.classList.contains('feed-post-cached'))
                    continue;

                var encryptedContent = userPost.innerHTML;

                var pgpMessage = openpgp.message.readArmored(encryptedContent);
                var encIDs = pgpMessage.getEncryptionKeyIds();
                if(encIDs.indexOf(privateKeyID) === -1)
                    throw new Error("pk mismatch [" + encIDs.join(', ') + "] != " + privateKeyID);

                var pgpMessageData = openpgp.armor.decode(encryptedContent).data;

                var ui = 0;
                var postData;
                var foundPost = false;
                while(postData = localStorage.getItem(PREFIX_FEED_POSTS_BY_KEY + ':' + privateKeyID + (++ui).toString())) {
                    if(!foundPost && postData.indexOf(pgpMessageData) === -1) {
                        foundPost = true;
                    }
                }

                if(!foundPost) {
                    var feedKey = PREFIX_FEED_POSTS_BY_KEY + ':' + privateKeyID + (ui);
                    console.log("Caching new user post to local storage block " + feedKey);
                    postData = localStorage.getItem(feedKey);
                    if(postData.length > MAX_BLOCK_SIZE) {
                        feedKey = PREFIX_FEED_POSTS_BY_KEY + ':' + privateKeyID + (ui + 1);
                        postData = localStorage.getItem(feedKey);
                        if(postData.length > MAX_BLOCK_SIZE)
                            throw new Error("Shouldn't happen");
                    }
                    postData += (postData.length === 0 ? '' : "\n") + pgpMessageData;
                    localStorage.setItem(feedKey, postData);
                }

                userPost.classList.add('feed-post-cached');
            }
        }

    }

    var selectedKeyID = null;
    function doFocus(e) {
        var formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);
        if(formElm.getAttribute('name') !== 'post-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));

        var optGroupPGPIdentities = formElm.getElementsByClassName('pgp-identities');
        var selectPGPIDElm = formElm.querySelector('*[name=pgp-id]');
        var passphraseElm = formElm.querySelector('*[name=passphrase]');

        if(selectPGPIDElm.value === selectedKeyID)
            return formElm;
        selectedKeyID = selectPGPIDElm.value;

        var local = new openpgp.Keyring.localstore();
        var keys = local.loadPrivate();

        var optGroupHTML = '';
        for(var ki=0; ki<keys.length; ki++) {
            var key = keys[ki];
            var keyID = key.getKeyIds()[0].toHex();
            var userID = key.getUserIds().join('; ');
            if(!selectedKeyID)
                selectedKeyID = keyID;
            optGroupHTML += '<option ' + (keyID === selectedKeyID ? 'selected="selected"' : '') + ' value="' + keyID + '">' + (key.primaryKey.isDecrypted ? '' : '(*) ') + userID + '</option>';
            if(selectedKeyID === keyID) {
                if(key.primaryKey.isDecrypted) {
                    passphraseElm.parentNode.style.display = 'none';
                    passphraseElm.style.display = 'none';
                } else {
                    passphraseElm.parentNode.style.display = 'block';
                    passphraseElm.style.display = 'inline-block';
                }
            }
        }
        optGroupPGPIdentities[0].innerHTML = optGroupHTML;
        return formElm;
    }

    window.focusPostForm = doFocus;


    window.submitPostForm = function(e) {
        e.preventDefault();
        var formElm = doFocus(e);

        var contentElm = formElm.querySelectorAll('*[name=content], input[type=text], textarea');
        if(contentElm.length === 0)
            throw new Error("No content field found");

        var channelElm = formElm.querySelectorAll('*[name=channel]');
        if(channelElm.length === 0 || !channelElm[0].value)
            throw new Error("No channel field found");

        var passphraseElm = formElm.querySelector('*[name=passphrase]');

        var local = new openpgp.Keyring.localstore();
        var keys = local.loadPrivate();

        if(keys.length === 0) {
            setStatus(formElm, "No PGP Keypairs found on this browser. Please load or <a href='#REGISTER'>register</a> a new account");
            throw new Error("No PGP Keypairs found on this browser. Please load or <a href='#REGISTER'>register</a> a new account");
        }

        var decryptedKeys = [];
        var passphraseAttempts = 0;
        for(var ki=0; ki<keys.length; ki++) {
            var key = keys[ki];
            if(!key.primaryKey.isDecrypted)
                if(passphraseElm.value) {
                    passphraseAttempts++;
                    key.primaryKey.decrypt(passphraseElm.value);
                }

            if(key.primaryKey.isDecrypted)
                decryptedKeys.push(key);
        }

        if(decryptedKeys.length === 0) {
            var errMSG = passphraseAttempts == 0
                ? 'PGP key pair requires a passphrase'
                : 'Invalid PGP passphrase (' + passphraseAttempts + ' private keys attempted)';
            setStatus(formElm, "<span class='error'>" + errMSG + "</span>");
            passphraseElm.focus();
            throw new Error(errMSG);
        }

        // TODO: select from multiple keys

        var selectedKey = decryptedKeys[0];
        var selectedKeyID = selectedKey.getKeyIds()[0].toHex();

        var postChannel = fixHomePath(channelElm[0].value, selectedKeyID);

        var postContent = contentElm[0].value.trim();
        if(!postContent.length)
            throw new Error ("Empty post content");

        postContent = "<div class='feed-post'>" + postContent + "</div>";

        //var commandString = "MESSAGE " + postChannel + ' !post ' + postContent;

        setStatus(formElm, "Encrypting Post...");
        openpgp.encryptMessage(selectedKey, postContent)
            .then(function(encryptedString) {

                var commandString = "MESSAGE " + postChannel + ' ' + "<div class='pgp-message " + PREFIX_FEED_POSTS_BY_KEY + ":" + selectedKeyID + "'>" + encryptedString + "</div>";
                setStatus(formElm, "Posting to feed...");

                // encrypted

                var socketEvent = new CustomEvent('socket', {
                    detail: commandString,
                    cancelable:true,
                    bubbles:true
                });
                formElm.dispatchEvent(socketEvent);
                //if(e.isDefaultPrevented())
                //    messageElm.value = '';

            }).catch(function(error) {
                throw new Error(error);

            });


    };


    function fixHomePath(channelPath, keyID) {
        channelPath = fixChannelPath(channelPath);
        if(channelPath[0] === '~') {
            channelPath = channelPath.substr(1);
            if(!channelPath || channelPath[0] !== '/')
                channelPath = '/' + channelPath;
            channelPath = '/home/' + keyID + channelPath;
        }
        return channelPath;
    }

    function fixChannelPath(channelPath) {
        if(!channelPath || !/#?[~:./a-z_-]+/i.test(channelPath))
            throw new Error("Invalid Path: " + channelPath);
        return channelPath;
    }

    function setStatus(formElm, statusText) {
        var statusElm = formElm.querySelector('.status-box');
        if(!statusElm) {
            statusElm = document.createElement('div');
            statusElm.setAttribute('class', 'status-box');
            formElm.firstChild ? formElm.insertBefore(statusElm, formElm.firstChild) : formElm.appendChild(statusElm);
        }
        statusElm.innerHTML = statusText;
        console.log(statusText);
    }

    var SCRIPT_PATH = 'cmd/pgp/pgp-form.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();
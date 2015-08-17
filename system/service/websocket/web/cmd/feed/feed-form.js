/**
 * Created by ari on 7/2/2015.
 */


(function() {
    var MAX_BLOCK_SIZE = 5000;
    var CLASS_FEED_POST = 'feed-post';
    var CLASS_FEED_POST_CACHED = 'feed-post-cached';
    var CLASS_FEED_POST_DECRYPTED_CONTENT = 'feed-post-decrypted-content';
    var CLASS_PGP_MESSAGE = 'pgp-message';
    var PREFIX_FEED_POSTS_BY_KEY = 'feed-posts-by-key';
    var PREFIX_REPLIES_POSTS_BY_KEY = 'feed-replies-by-key';


    document.addEventListener('log', function(e) {
        var htmlContainer = e.target;
//         if(htmlContainer.getElementsByClassName(CLASS_FEED_POST).length > 0) // TODO: ugly/inefficient
//            updateUserFeedCache(htmlContainer);
    });

    //
    //function updateUserFeedCache(containerElm) {
    //    if(!containerElm)
    //        containerElm = document;
    //
    //    var LocalStore = new openpgp.Keyring.localstore();
    //    var privateKeys = LocalStore.loadPrivate();
    //    var publicKeys = LocalStore.loadPublic();
    //    var allKeys = privateKeys.concat(publicKeys);
    //
    //    for(var i=0; i<allKeys.length; i++) {
    //        var pgpKey = allKeys[i];
    //        var pgpKeyIDs = pgpKey.getKeyIds();
    //        var feedKeyID = pgpKey.primaryKey.getKeyId().toHex();
    //
    //        var userPosts = containerElm.getElementsByClassName(PREFIX_FEED_POSTS_BY_KEY + ':' + feedKeyID);
    //
    //        for(var j=0; j<userPosts.length; j++) {
    //            var userPostElm = userPosts[j];
    //            if(!userPostElm.classList.contains(CLASS_FEED_POST_CACHED)) {
    //                var pgpMessageContent = userPostElm.getElementsByClassName(CLASS_PGP_MESSAGE)[0].innerHTML;
    //                var pgpMessage = openpgp.message.readArmored(pgpMessageContent);
    //
    //                var encryptionIDs = pgpMessage.getEncryptionKeyIds();
    //
    //                if(!hasMatchingIDs(pgpKeyIDs, encryptionIDs))
    //                    throw new Error("pk mismatch " + encryptionIDs.join(', ') + " ! IN " + pgpKeyIDs.join(', '));
    //
    //                //addVerifiedPostContentToDB(pgpMessageContent, feedKeyID); // TODO cache command
    //                userPostElm.classList.add(CLASS_FEED_POST_CACHED);
    //            }
    //
    //
    //            if(userPostElm.getElementsByClassName(CLASS_FEED_POST_DECRYPTED_CONTENT).length === 0) {
    //                var decryptedContentContainer = document.createElement('span');
    //                decryptedContentContainer.setAttribute('class', CLASS_FEED_POST_DECRYPTED_CONTENT);
    //                decryptedContentContainer.innerHTML = '<span class="action">decrypting...</span>';
    //                userPostElm.appendChild(decryptedContentContainer);
    //
    //                function decrypt(privateKey, pgpMessage, decryptedContentContainer) {
    //
    //                    openpgp.decryptMessage(privateKey, pgpMessage)
    //                        .then(function(decryptedMessage) {
    //                            decryptedContentContainer.innerHTML = decryptedMessage;
    //
    //                        }, function(error) {
    //                            decryptedContentContainer.innerHTML += '<span class="error">' + error + '</span>';
    //                            console.log("Could not decrypt", error, privateKey, pgpMessage, decryptedContentContainer);
    //
    //                        }).catch(function(error) {
    //                            decryptedContentContainer.innerHTML += '<span class="error">' + error + '</span>';
    //                            throw new Error(error);
    //
    //                        });
    //                }
    //                console.log("Attempting to decrypt with: " + feedKeyID, userPostElm);
    //                decrypt(pgpKey, pgpMessage, decryptedContentContainer);
    //            }
    //        }
    //    }
    //
    //}
    //

    var selectedKeyID = null;
    function doFocus(e) {
        var formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);
        if(formElm.getAttribute('name') !== 'post-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));

        var optGroupPGPIdentities = formElm.getElementsByClassName('pgp-identities')[0];
        var selectPGPIDElm = formElm.querySelector('*[name=pgp-id]');
        var passphraseElm = formElm.querySelector('*[name=passphrase]');

        if(selectedKeyID
            && selectPGPIDElm.value === selectedKeyID)
            return formElm;
        selectedKeyID = selectPGPIDElm.value;

        optGroupPGPIdentities.innerHTML = '';
        self.PGPDB.queryPrivateKeys(function(pkData) {
            var privateKey = openpgp.key.readArmored(pkData.block_private).keys[0];

            var keyID = pkData.id_private;
            if(!selectedKeyID)
                selectedKeyID = keyID;
            var userID = privateKey.getUserIds().join('; ');

            optGroupPGPIdentities.innerHTML += '<option ' + (keyID === selectedKeyID ? 'selected="selected"' : '') + ' value="' + keyID + '">' + (privateKey.primaryKey.isDecrypted ? '' : '(*) ') + userID.replace(/</, '&lt;') + '</option>';
            if(selectedKeyID === keyID) {
                if(privateKey.primaryKey.isDecrypted) {
                    passphraseElm.parentNode.style.display = 'none';
                    passphraseElm.style.display = 'none';
                    passphraseElm.removeAttribute('required');
                } else {
                    passphraseElm.parentNode.style.display = 'block';
                    passphraseElm.style.display = 'inline-block';
                    passphraseElm.setAttribute('required', 'required');
                }
            }
        });

        return formElm;
    }

    window.focusPostForm = doFocus;


    window.submitPostForm = function(e) {
        e.preventDefault();
        var formElm = doFocus(e);

        var postContentElm = formElm.querySelector('*[name=content], input[type=text], textarea');
        if(!postContentElm)
            throw new Error("No content field found");

        var channelElm = formElm.querySelector('*[name=channel]');
        if(!channelElm)
            throw new Error("No channel field found");

        var selectPGPIDElm = formElm.querySelector('*[name=pgp-id]');
        var selectedPGPFingerprint = selectPGPIDElm.value;
        var passphraseElm = formElm.querySelector('*[name=passphrase]');

        var postContent = postContentElm.value.trim();
        if(!postContent.length)
            throw new Error ("Empty post content");

        self.PGPDB.getPrivateKeyData(selectedPGPFingerprint, function(err, privateKeyData) {
            if(err)
                throw new Error(err);

            if(!privateKeyData)
                throw new Error("Private key not found: " + selectedPGPFingerprint);

            if(!privateKeyData.block_private)
                throw new Error("Private key missing private block: " + selectedPGPFingerprint);

            var passphrase = passphraseElm.value || '';
            var privateKey = openpgp.key.readArmored(privateKeyData.block_private).keys[0];
//             var publicKey = openpgp.key.readArmored(privateKeyData.block_pubic).keys[0];
            if(!privateKey.primaryKey.isDecrypted) {
                if (passphrase) {
                    privateKey.primaryKey.decrypt(passphraseElm.value);
                }
            }

            if(!privateKey.primaryKey.isDecrypted) {
                var errMSG = passphrase === ''
                    ? 'PGP key pair requires a passphrase'
                    : 'Invalid PGP passphrase';
                setStatus(formElm, "<span class='error'>" + errMSG + "</span>");
                passphraseElm.focus();
                throw new Error(errMSG);
            }

            var publicKeyID = privateKeyData.id_public;
            publicKeyID = publicKeyID.substr(publicKeyID.length - 8);

            var postChannel = fixHomePath(channelElm.value, publicKeyID);
            var homeChannel = fixHomePath('~', publicKeyID);

            postContent = "<div class='" + CLASS_FEED_POST + "' data-channel='" + postChannel + "' data-timestamp='" + Date.now() + "'>" + postContent + "</div>";

            //var commandString = "MESSAGE " + postChannel + ' !post ' + postContent;

            setStatus(formElm, "Encrypting Post...");
            openpgp.signClearMessage(privateKey, postContent)
                .then(function(encryptedString) {

                    setStatus(formElm, "Adding post to database...");
                    self.FeedDB.verifyAndAddPostToDB(encryptedString);

                    setStatus(formElm, "Posting to feed [" + homeChannel + "] ...");

                    var commandString = "MESSAGE " + homeChannel + " " + encryptedString;

                    var socketEvent = new CustomEvent('socket', {
                        detail: commandString,
                        cancelable:true,
                        bubbles:true
                    });
                    formElm.dispatchEvent(socketEvent);

                    if(!socketEvent.defaultPrevented)
                        throw new Error("Socket event for new post was not handled");

                    postContentElm.value = '';
                });
        });

        //var local = new openpgp.Keyring.localstore();
        //var keys = local.loadPrivate();

        //if(keys.length === 0) {
        //    setStatus(formElm, "No PGP Keypairs found on this browser. Please load or <a href='#REGISTER'>register</a> a new account");
        //    throw new Error("No PGP Keypairs found on this browser. Please load or <a href='#REGISTER'>register</a> a new account");
        //}

        //var decryptedKeys = [];
        //var passphraseAttempts = 0;
        //for(var ki=0; ki<keys.length; ki++) {
        //    var key = keys[ki];
        //    if(!key.primaryKey.isDecrypted)
        //        if(passphraseElm.value) {
        //            passphraseAttempts++;
        //            key.primaryKey.decrypt(passphraseElm.value);
        //        }
        //
        //    if(key.primaryKey.isDecrypted)
        //        decryptedKeys.push(key);
        //}

        //if(decryptedKeys.length === 0) {
        //    var errMSG = passphraseAttempts == 0
        //        ? 'PGP key pair requires a passphrase'
        //        : 'Invalid PGP passphrase (' + passphraseAttempts + ' private keys attempted)';
        //    setStatus(formElm, "<span class='error'>" + errMSG + "</span>");
        //    passphraseElm.focus();
        //    throw new Error(errMSG);
        //}


        //var selectedKey = decryptedKeys[0];
        //var selectedKeyID = selectedKey.getKeyIds()[0].toHex();



    };


    function hasMatchingIDs(keyIDs1, keyIDs2) {
        for(var i=0; i<keyIDs1.length; i++) {
            for(var j=0; j<keyIDs2.length; j++) {
                if(keyIDs1[i].toHex() === keyIDs2[j].toHex()) {
                    return true;
                }
            }
        }
        return false;
    }


    function fixHomePath(channelPath, keyID) {
        keyID = keyID.substr(keyID.length - 8);
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


// For Public/Private Key Database access
(function() {
    var SCRIPT_PATH = 'cmd/pgp/pgp-db.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();




// For Feed Database access
(function() {
    var SCRIPT_PATH = 'cmd/feed/feed-db.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();


// For PGP Decryption of feed posts
(function() {
    var SCRIPT_PATH = 'cmd/pgp/pgp-listener.js';
    var head = document.getElementsByTagName('head')[0];
    if (head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();


// For PGP Decryption in chat rooms
(function() {
    var SCRIPT_PATH = 'cmd/feed/feed-listener.js';
    var head = document.getElementsByTagName('head')[0];
    if (head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();
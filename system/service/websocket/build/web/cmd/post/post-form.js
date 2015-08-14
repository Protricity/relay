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
            updateUserFeedCache(htmlContainer);
    });

    function addPostToLocalStorage(pgpMessageContent, feedKeyID) {
        var pgpMessageData = openpgp.armor.decode(pgpMessageContent).data;

        var ui = 0;
        var postData, feedKey;
        while(postData = localStorage.getItem(
            PREFIX_FEED_POSTS_BY_KEY + ':' + feedKeyID + (ui>0 ? ':' + ui : ''))) {
            if(postData.indexOf(pgpMessageData) >= 0)
                return false;
            ui++;
        }

        console.log("Caching new user post to local storage block " + feedKey);

        postData = localStorage.getItem(PREFIX_FEED_POSTS_BY_KEY + ':' + feedKeyID) || '';

        if(postData.length + pgpMessageContent.length > MAX_BLOCK_SIZE) {
            var lastPostData = postData;
            ui = 1;
            while(true) {
                feedKey = PREFIX_FEED_POSTS_BY_KEY + ':' + feedKeyID + (ui>0 ? ':' + ui++ : '');
                postData = localStorage.getItem(feedKey);
                localStorage.setItem(feedKey, lastPostData); // Switch out data
                if(!postData)
                    break; // Nothing to pass up, so just ... ya know.... break!
                lastPostData = postData;
            }
            postData = '';
        }
        postData = pgpMessageData + (postData.length === 0 ? '' : "\n" + postData);
        localStorage.setItem(PREFIX_FEED_POSTS_BY_KEY + ':' + feedKeyID, postData);

    }

    function updateUserFeedCache(containerElm) {
        if(!containerElm)
            containerElm = document;

        var LocalStore = new openpgp.Keyring.localstore();
        var privateKeys = LocalStore.loadPrivate();
        var publicKeys = LocalStore.loadPublic();
        var allKeys = privateKeys.concat(publicKeys);

        for(var i=0; i<allKeys.length; i++) {
            var pgpKey = allKeys[i];
            var pgpKeyIDs = pgpKey.getKeyIds();
            var feedKeyID = pgpKey.primaryKey.getKeyId().toHex();

            var userPosts = containerElm.getElementsByClassName(PREFIX_FEED_POSTS_BY_KEY + ':' + feedKeyID);

            for(var j=0; j<userPosts.length; j++) {
                var userPostElm = userPosts[j];
                if(!userPostElm.classList.contains(CLASS_FEED_POST_CACHED)) {
                    var pgpMessageContent = userPostElm.getElementsByClassName(CLASS_PGP_MESSAGE)[0].innerHTML;
                    var pgpMessage = openpgp.message.readArmored(pgpMessageContent);

                    var encryptionIDs = pgpMessage.getEncryptionKeyIds();

                    if(!hasMatchingIDs(pgpKeyIDs, encryptionIDs))
                        throw new Error("pk mismatch " + encryptionIDs.join(', ') + " ! IN " + pgpKeyIDs.join(', '));

                    addPostToLocalStorage(pgpMessageContent, feedKeyID);
                    userPostElm.classList.add(CLASS_FEED_POST_CACHED);
                }


                if(userPostElm.getElementsByClassName(CLASS_FEED_POST_DECRYPTED_CONTENT).length === 0) {
                    var decryptedContentContainer = document.createElement('span');
                    decryptedContentContainer.setAttribute('class', CLASS_FEED_POST_DECRYPTED_CONTENT);
                    decryptedContentContainer.innerHTML = '<span class="action">decrypting...</span>';
                    userPostElm.appendChild(decryptedContentContainer);

                    function decrypt(privateKey, pgpMessage, decryptedContentContainer) {

                        openpgp.decryptMessage(privateKey, pgpMessage)
                            .then(function(decryptedMessage) {
                                decryptedContentContainer.innerHTML = decryptedMessage;

                            }, function(error) {
                                decryptedContentContainer.innerHTML += '<span class="error">' + error + '</span>';
                                console.log("Could not decrypt", error, privateKey, pgpMessage, decryptedContentContainer);

                            }).catch(function(error) {
                                decryptedContentContainer.innerHTML += '<span class="error">' + error + '</span>';
                                throw new Error(error);

                            });
                    }
                    console.log("Attempting to decrypt with: " + feedKeyID, userPostElm);
                    decrypt(pgpKey, pgpMessage, decryptedContentContainer);
                }
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

        postContent = "<div class='" + CLASS_FEED_POST + "' data-channel='" + postChannel + "'>" + postContent + "</div>";

        //var commandString = "MESSAGE " + postChannel + ' !post ' + postContent;

        setStatus(formElm, "Encrypting Post...");
        openpgp.encryptMessage(selectedKey, postContent)
            .then(function(encryptedString) {

                addPostToLocalStorage(encryptedString, selectedKeyID);


                var commandString = "MESSAGE " + postChannel + ' ' +
                    "<div class='" + PREFIX_FEED_POSTS_BY_KEY + ":" + selectedKeyID + "'>" +
                        "<div class='pgp-message'>" + encryptedString + "</div>" +
                    "</div>";
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

                //updateUserFeedCache();

            }).catch(function(error) {
                throw new Error(error);

            });


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
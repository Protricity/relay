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

    var postFormUninitiatedElms = document.getElementsByClassName('feed-post-form:uninitiated');

    document.addEventListener('log', function(e) {
        for(var i=postFormUninitiatedElms.length-1; i>=0; i--)
            (function(postFormUninitiatedElm) {
                postFormUninitiatedElm.classList.remove('feed-post-form:uninitiated');
                doFocus(e, postFormUninitiatedElm);
            })(postFormUninitiatedElms[i]);
    });

    self.scrollFeed = function(e) {
        console.log(this.scrollTop, this.scrollHeight, this.scrollHeight - this.scrollTop - this.offsetHeight);
    };

    self.toggleFeedPostLike = function(uid) {
        console.log("Like " + uid);
    };

    self.toggleSection = function(sectionClassNames, toggleValue) {
        if(typeof sectionClassNames !== 'object')
            sectionClassNames = [sectionClassNames];

        var THIS = null;
        for(var i=0; i<sectionClassNames.length; i++) {

            var sectionClassName = sectionClassNames[i];
            var sections = document.getElementsByClassName(sectionClassName);
            for(var j=0; j<sections.length; j++) {
                if(!THIS) {
                    THIS = sections[j];
                    if(typeof toggleValue === 'undefined')
                        toggleValue = typeof THIS._toggle !== 'undefined' ? !THIS._toggle : true;
                    THIS._toggle = toggleValue;
                }
                sections[j].style.display = THIS._toggle ? 'block' : 'none';
            }

        }
    };

    var selectedKeyID = null;
    function doFocus(e, formElm) {
        formElm = formElm || (e.target.form ? e.target.form : e.target);
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);
        if(formElm.getAttribute('name') !== 'feed-post-form')
            throw new Error("Wrong Form name: " + formElm.getAttribute('name'));

        var optGroupPGPIdentities = formElm.getElementsByClassName('pgp-identities')[0];
        var selectPGPIDElm = formElm.querySelector('*[name=pgp-id]');
        var passphraseElm = formElm.querySelector('*[name=passphrase]');
        var postContentElm = formElm.querySelector('*[name=content], input[type=text], textarea');
        if(!postContentElm)
            throw new Error("No content field found");

        var showSectionsValue = postContentElm.value.length > 0;
        var sections = formElm.getElementsByClassName(showSectionsValue ? 'show-section-on-value' : 'hide-section-on-no-value');
        for(var si=0; si<sections.length; si++)
            sections[si].style.display = showSectionsValue ? 'block' : 'none';

        if(showSectionsValue === false)
            return formElm;

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
                    passphraseElm.removeAttribute('required');
                } else {
                    passphraseElm.parentNode.style.display = 'block';
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

        var pathElm = formElm.querySelector('*[name=path]');
        if(!pathElm)
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

            var postPath = pathElm.value;
            var fixedPostPath = fixHomePath(postPath, publicKeyID);
            var homeChannel = fixHomePath('~', publicKeyID);
            var timestamp = Date.now();

            postContent = "<div class='" + CLASS_FEED_POST + "' data-path='" + fixedPostPath + "' data-timestamp='" + timestamp + "'>" + postContent + "</div>";
            try {
                protectHTMLContent(postContent);
            } catch (e) {
                setStatus(formElm, e.toString());
                throw e;
            }

            //var commandString = "MESSAGE " + postChannel + ' !post ' + postContent;

            setStatus(formElm, "Encrypting Post...");
            openpgp.signClearMessage(privateKey, postContent)
                .then(function(encryptedString) {

                    setStatus(formElm, "Adding post to database...");
                    self.FeedDB.verifyAndAddPostToDB(encryptedString, function() {
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

                        setStatus(formElm, "Feed Post Successful");
                        postContentElm.value = '';

                        commandString = "FEED " + postPath;
                        socketEvent = new CustomEvent('socket', {
                            detail: commandString,
                            cancelable:true,
                            bubbles:true
                        });
                        formElm.dispatchEvent(socketEvent);
                        if(!socketEvent.defaultPrevented)
                            throw new Error("Socket event for feed command was not handled");
                    });
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


    function protectHTMLContent(htmlContent) {
        var tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };

        htmlContent = htmlContent.replace(/[&<>]/g, function(tag) {
            return tagsToReplace[tag] || tag;
        });

        htmlContent = htmlContent.replace(/&lt;(a|p|span|div)(?:\s+(class|data-path|data-timestamp)=[^=&]+\s*)*&gt;/g, function(tag) {
            tag = tag.replace('&lt;', '<');
            return tag;
        });

        htmlContent = htmlContent.replace(/&lt;\//i, '</');
        htmlContent = htmlContent.replace(/&gt;/ig, '>');

        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match)
            throw new Error("Dangerous HTML: " + match[2]);

        return htmlContent;
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

    function setStatus(formElm, statusText, append) {
        var statusElms = formElm.getElementsByClassName('status-box');
        for(var i=0; i<statusElms.length; i++) (function(statusElm) {
            if(append)
                statusElm.innerHTML += (statusElm.innerHTML ? '<br/>' : '') + statusText;
            else
                statusElm.innerHTML = statusText;
        })(statusElms[i]);
    }

    var SCRIPT_PATH = 'command/pgp/pgp-listener.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }

    // Includes

    function includeScript(scriptPath, onInsert) {
        var head = document.getElementsByTagName('head')[0];
        if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
            var newScript = document.createElement('script');
            newScript.setAttribute('src', scriptPath);
            head.appendChild(newScript);
            if(onInsert)
                onInsert();
        }
    }
    // For PGP Decryption in chat rooms
    var openPGPScriptPath = 'command/pgp/lib/openpgpjs/openpgp.js';
    includeScript(openPGPScriptPath, function() {

        var timeout = setInterval(function() {
            var src = openPGPScriptPath.replace('/openpgp.', '/openpgp.worker.');
            if(!window.openpgp || window.openpgp._worker_init)
                return;
            window.openpgp.initWorker(src);
            window.openpgp._worker_init = true;
            clearInterval(timeout);
            //console.info("OpenPGP Worker Loaded: " + src);
        }, 500);
    });

    // For Public/Private Key Database access
    includeScript('command/pgp/pgp-db.js');

    // For Public/Private Key Decryption Events
    includeScript('command/pgp/pgp-listener.js');

    // For Content Database access
    includeScript('command/rest/rest-db.js');

    // For Content Events
    includeScript('command/feed/feed-listener.js');

})();
//
//(function() {
//    var SCRIPT_PATH = 'command/pgp/lib/openpgpjs/openpgp.js';
//    var head = document.getElementsByTagName('head')[0];
//    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
//        var newScript = document.createElement('script');
//        newScript.setAttribute('src', SCRIPT_PATH);
//        head.appendChild(newScript);
//
//        var timeout = setInterval(function() {
//            var src = SCRIPT_PATH.replace('/openpgp.', '/openpgp.worker.');
//            if(!window.openpgp || window.openpgp._worker_init)
//                return;
//            window.openpgp.initWorker(src);
//            window.openpgp._worker_init = true;
//            clearInterval(timeout);
////             console.info("OpenPGP Worker Loaded: " + src);
//        }, 500);
//    }
//})();
//
//
//// For Public/Private Key Database access
//(function() {
//    var SCRIPT_PATH = 'command/pgp/pgp-db.js';
//    var head = document.getElementsByTagName('head')[0];
//    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
//        var newScript = document.createElement('script');
//        newScript.setAttribute('src', SCRIPT_PATH);
//        head.appendChild(newScript);
//    }
//})();
//
//
//
//
//// For Feed Database access
//(function() {
//    var SCRIPT_PATH = 'command/feed/feed-db.js';
//    var head = document.getElementsByTagName('head')[0];
//    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
//        var newScript = document.createElement('script');
//        newScript.setAttribute('src', SCRIPT_PATH);
//        head.appendChild(newScript);
//    }
//})();
//
//
//// For PGP Decryption of feed posts
//(function() {
//    var SCRIPT_PATH = 'command/pgp/pgp-listener.js';
//    var head = document.getElementsByTagName('head')[0];
//    if (head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
//        var newScript = document.createElement('script');
//        newScript.setAttribute('src', SCRIPT_PATH);
//        head.appendChild(newScript);
//    }
//})();
//
//
//// For PGP Decryption in chat rooms
//(function() {
//    var SCRIPT_PATH = 'command/feed/feed-listener.js';
//    var head = document.getElementsByTagName('head')[0];
//    if (head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
//        var newScript = document.createElement('script');
//        newScript.setAttribute('src', SCRIPT_PATH);
//        head.appendChild(newScript);
//    }
//})();
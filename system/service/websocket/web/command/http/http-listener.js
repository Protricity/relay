/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var REFRESH_TIMEOUT = 200;

    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('input', onFormEvent);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'http-put-form':
                refreshHTTPPutForm(e, formElm);
                if(e.type === 'submit')
                    submitHTTPPutForm(e, formElm);
                return true;

            default:
                if(e.type === 'submit')
                    e.preventDefault();
                return false;
        }
    }

    var refreshTimeout = null;
    function refreshHTTPPutForm(e, formElm) {
        var passphraseElm = formElm.querySelector('*[name=passphrase][type=password], [type=password]');
        var postContentElm = formElm.querySelector('textarea[name=content]');
        var pgpIDPrivateElm = formElm.querySelector('*[name=pgp_id_private]');

        if(pgpIDPrivateElm.value) {
            var optionSplit = pgpIDPrivateElm.value.split(',');
            var selectedPrivateKeyID = optionSplit[0];
            var selectedPrivateKeyRequiresPassphrase = optionSplit.length > 1 && optionSplit[1] === '1';
            formElm.classList[selectedPrivateKeyRequiresPassphrase ? 'add' : 'remove']('passphrase-required');
            passphraseElm[(selectedPrivateKeyRequiresPassphrase ? 'set' : 'remove') + 'Attribute']('required', 'required');
        }

        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(function() {
            formElm.classList[postContentElm.value.length === 0 ? 'add' : 'remove']('compact');

            var newOptionHTML = '';
            PGPDB.queryPrivateKeys(function(pkData) {
                var privateKeyID = pkData.id_private;
                var optionValue = privateKeyID + (pkData.passphrase_required ? ',1' : '');

                if(!pgpIDPrivateElm.value)
                    pgpIDPrivateElm.value = optionValue;
                var userID = pkData.user_id;

                newOptionHTML +=
                    '<option ' + (privateKeyID === selectedPrivateKeyID ? 'selected="selected"' : '') + ' value="' + optionValue + '">' +
                        (pkData.passphrase_required ? '(*) ' : '') + userID.replace(/</, '&lt;') +
                    '</option>';

            }, function() {
                var optGroupPGPIdentities = formElm.getElementsByClassName('pgp-identities')[0];
                optGroupPGPIdentities.innerHTML = newOptionHTML;

            });
        }, REFRESH_TIMEOUT);
    }

    function submitHTTPPutForm(e, formElm) {
        e.preventDefault();

        var passphraseElm = formElm.querySelector('*[name=passphrase][type=password], [type=password]');
        var postContentElm = formElm.querySelector('textarea[name=content]');
        var pgpIDPrivateElm = formElm.querySelector('*[name=pgp_id_private]');

        if(!pgpIDPrivateElm.value)
            throw new Error("Invalid Private Key ID");
        var optionSplit = pgpIDPrivateElm.value.split(',');
        var selectedPrivateKeyID = optionSplit[0];

        self.PGPDB.getPrivateKeyData(selectedPrivateKeyID, function(err, privateKeyData) {
            if(err)
                throw new Error(err);

            if(!privateKeyData)
                throw new Error("Private key not found: " + selectedPrivateKeyID);

            var passphrase = passphraseElm.value || '';
            var privateKey = openpgp.key.readArmored(privateKeyData.block_private).keys[0];
            if(!privateKey.primaryKey.isDecrypted)
                if (passphrase)
                    privateKey.primaryKey.decrypt(passphrase);

            if(!privateKey.primaryKey.isDecrypted) {
                var errMSG = passphrase === ''
                    ? 'PGP key pair requires a passphrase'
                    : 'Invalid PGP passphrase';
                setStatus(formElm, "<span class='error'>" + errMSG + "</span>", 2, true);
                passphraseElm.focus();
                throw new Error(errMSG);
            }


            var publicKeyID = privateKeyData.id_public;
            publicKeyID = publicKeyID.substr(publicKeyID.length - 8);

            var pathElm = formElm.querySelector('*[name=path]');
            if(!pathElm)
                throw new Error("No channel field found");
            //var postPath = pathElm.value;
            var fixedPostPath = fixHomePath(pathElm.value, publicKeyID);
            var homeChannel = '~'; // fixHomePath('~', publicKeyID);
            var timestamp = Date.now();

            var postContent = postContentElm.value.trim();
            if(!postContent.length)
                throw new Error ("Empty post content");
            var contentDiv = document.createElement('div');
            contentDiv.innerHTML = postContent;
            var articleElm = contentDiv.querySelector('article');
            if(!articleElm) {
                contentDiv.innerHTML = "<article>" + contentDiv.innerHTML + "</article>";
                articleElm = contentDiv.querySelector('article');
            }
            articleElm.setAttribute('data-path', fixedPostPath);
            articleElm.setAttribute('data-timestamp', timestamp.toString());
            postContent = articleElm.outerHTML;

            postContent = protectHTMLContent(postContent, formElm);

            setStatus(formElm, "<span class='command'>Sign</span>ing content...");
            openpgp.signClearMessage(privateKey, postContent)
                .then(function(pgpSignedContent) {

                    setStatus(formElm, "Adding post to database...");
                    HttpDB.verifyAndAddContentToDB(pgpSignedContent, function() {
                        //setStatus(formElm, "<span class='command'>Message</span>ing channel [" + homeChannel + "]");

                        var commandString = "CHAT " + homeChannel + " " + pgpSignedContent;

                        var socketEvent = new CustomEvent('socket', {
                            detail: commandString,
                            cancelable:true,
                            bubbles:true
                        });
                        formElm.dispatchEvent(socketEvent);

                        if(!socketEvent.defaultPrevented)
                            throw new Error("Socket event for new post was not handled");

                        setStatus(formElm, "<span class='command'>Put</span> <span class='success'>Successful</span>");
                        postContentElm.value = '';
                    });
                });

        });
    }

    function protectHTMLContent(htmlContent, formElm) {
        var tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };

        htmlContent = htmlContent.replace(/[&<>]/g, function(tag) {
            return tagsToReplace[tag] || tag;
        });

        htmlContent = htmlContent.replace(/&lt;(a|p|span|article|header|footer|section)(?:\s+(class|data-path|data-timestamp)=[^=&]+\s*)*&gt;/g, function(tag) {
            tag = tag.replace('&lt;', '<');
            return tag;
        });

        htmlContent = htmlContent.replace(/&lt;\//i, '</');
        htmlContent = htmlContent.replace(/&gt;/ig, '>');

        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match) {
            var err = "Dangerous HTML: " + match[2];
            if(formElm)
                setStatus(formElm, err);
            throw new Error(err);
        }

        return htmlContent;
    }

    function setStatus(formElm, statusText, prependTimeout, unique) {
        var statusElms = formElm.getElementsByClassName('status-box');
        for(var i=0; i<statusElms.length; i++) (function(statusElm) {
            var textDiv = document.createElement('div');
            textDiv.innerHTML = statusText;

            if(unique && statusElm.innerHTML.indexOf(textDiv.innerHTML) !== -1)
                return;

            if(prependTimeout) {
                statusElm.firstChild
                    ? statusElm.insertBefore(textDiv, statusElm.firstChild)
                    : statusElm.appendChild(textDiv);
                if(typeof prependTimeout === 'number')
                    setTimeout(function () {
                        if(textDiv && textDiv.parentNode)
                            textDiv.parentNode.removeChild(textDiv);
                    }, prependTimeout * 1000);
            } else {
                statusElm.innerHTML = statusText;
            }
        })(statusElms[i]);
    }


    function fixHomePath(channelPath, keyID) {
        keyID = keyID.substr(keyID.length - 8);
        if(channelPath[0] === '~') {
            channelPath = channelPath.substr(1);
            if(!channelPath || channelPath[0] !== '/')
                channelPath = '/' + channelPath;
            channelPath = '/home/' + keyID + channelPath;
        }
        return channelPath;
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

    // For Config Access
    includeScript('command/config/config-db.js');

    // For Public/Private Key Database access
    includeScript('command/pgp/pgp-db.js');

    // For HTTP Content Database access
    includeScript('command/http/http-db.js');

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
})();

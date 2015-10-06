/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var REFRESH_TIMEOUT = 200;

    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('input', onFormEvent);
    self.addEventListener('change', onFormEvent);
    self.addEventListener('click', onClickEvent);
    self.addEventListener('dragstart', onDragEvent);
//     self.addEventListener('test', onUnitTestEvent);
    //self.addEventListener('drop', onDragEvent);
    //self.addEventListener('dragover', onDragEvent);

    function onClickEvent(e) {
        if(e.target.nodeName.toLowerCase() !== 'a')
            return;
        var anchorElement= e.target;
        var match = anchorElement.href.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var scheme = match[2];
        if(scheme.substr(0, 6).toLowerCase() !== 'socket')
            return;

        e.preventDefault();

        var browserID = null;
        var targetElm = e.target;
        while(!browserID && (targetElm = targetElm.parentNode) && targetElm.getAttribute)
            browserID = targetElm.getAttribute('data-browser-id');

        var commandString = "GET " + anchorElement.href;
        if(browserID)
            commandString = addContentHeader(commandString, 'Browser-ID', browserID);
            //commandString += "\nBrowser-ID: " + browserID;
        // TODO: grab latest timestamp from path via header

        var commandEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable: true,
            bubbles: true
        });
        e.target.dispatchEvent(commandEvent);

        // TODO: pending action status with .ks-browser

    }

    function onDragEvent(e) {
        switch(e.type) {
            case 'dragstart':
                var html = e.target.outerHTML ||  e.dataTransfer.getData("text/html");
                console.log(e.target, html);
                var htmlElm = document.createElement('template');
                htmlElm.innerHTML = html;
                var childNodes = htmlElm.content.querySelectorAll('*');
                for(var i=0; i<childNodes.length; i++) {
                    childNodes[i].removeAttribute('style');
                    childNodes[i].removeAttribute('class');
                    childNodes[i].removeAttribute('draggable');
                }
                    //while(childNodes[i].attributes.length > 0)
                    //    childNodes[i].removeAttribute(childNodes[i].attributes[0].name);
                htmlElm = htmlElm.content.firstChild;
                html = htmlElm.outerHTML;
                e.dataTransfer.setData("text/plain", "\n" + html);
                break;
            //case 'drop':
            //    if(typeof e.target.value !== 'undefined') {
            //        setTimeout(function() {
            //            onFormEvent(e, e.target.form);
            //        }, 200)
            //    } else {
            //        console.error("Invalid drop target: ", e.target);
            //    }
            //    break;
            case 'dragover':
                if(typeof e.target.value !== 'undefined') {
                    e.preventDefault();
                }
                break;
            default:
                throw new Error("Unknown event type: " + e.type);
        }
    }

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;
            
        switch(formElm.getAttribute('name')) {
            case 'ks-put-form':
                refreshHTTPPutForm(e, formElm);
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitHTTPPutForm(e, formElm);
                return true;

            case 'ks-browser-navigation-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitHTTPBrowserNavigationForm(e, formElm);
                return true;

            default:
                return false;
        }
    }

    var lastPostContent = null;
    function refreshHTTPPutForm(e, formElm) {
//         var pgpIDElm = formElm.querySelector('[name=pgp_id_public]');
// console.log(pgpIDElm);
//         if(!pgpIDElm.value) {
//             formElm.classList.add('id-required');
//             return;
//         }

        formElm.classList.remove('id-required');
//         var pgp_id_public = pgpIDElm.value;
        //var passphraseRequired = split[2] === '1';

        var passphraseElm = formElm.querySelector('*[name=passphrase][type=password], [type=password]');
        var postContentElm = formElm.querySelector('textarea[name=content]');

        if(postContentElm.value.length > 0)
            formElm.classList.remove('compact');
        //formElm.classList[passphraseRequired ? 'add' : 'remove']('passphrase-required');
        //formElm.classList[passphraseRequired ? 'remove' : 'add']('no-passphrase-required');
        //passphraseElm[(passphraseRequired ? 'set' : 'remove') + 'Attribute']('required', 'required');

        //if(!lastPostContent || lastPostContent != postContentElm.value || e.type === 'change') {
        //    lastPostContent = postContentElm.value;
        //
        //    if(refreshHTTPPutForm.previewTimeout)
        //        clearTimeout(refreshHTTPPutForm.previewTimeout);
        //    refreshHTTPPutForm.previewTimeout = setTimeout(function() {
        //        submitHTTPPutFormPreview(e, formElm);
        //    }, 200)
        //}
    }

    function submitHTTPPutFormPreview(e, formElm) {
        var postContentElm = formElm.querySelector('textarea[name=content]');
        var pgpIDPrivateElm = formElm.querySelector('*[name=pgp_id_private]');
        if(!pgpIDPrivateElm.value)
            throw new Error("Invalid Private Key ID");
        var pathElm = formElm.querySelector('*[name=path]');
        if(!pathElm)
            throw new Error("No channel field found");

        var optionSplit = pgpIDPrivateElm.value.split(',');
        var pgp_id_private = optionSplit[0];
        var pgp_id_public = optionSplit[0];
        var fixedPostPath = fixHomePath(pathElm.value, pgp_id_public);

        var timestamp = Date.now();

        var postContent = postContentElm.value.trim();
        if(!postContent.length)
            return false;

        var contentDiv = document.createElement('div');
        contentDiv.innerHTML = postContent;
        var articleElm = contentDiv.querySelector('article');
        if(!articleElm) {
            contentDiv.innerHTML = "<article>" + contentDiv.innerHTML + "</article>";
            articleElm = contentDiv.querySelector('article');
        }
        //articleElm.setAttribute('data-path', fixedPostPath);
        articleElm.setAttribute('data-timestamp', timestamp.toString());
        postContent = articleElm.outerHTML;

        postContent = protectHTMLContent(postContent, formElm);

        var previewCheckBoxElm = formElm.querySelector('input[name=preview]');
        //putPreviewElm.innerHTML = postContent;
        //console.log(putPreviewElm, postContent);
        var commandString = "PUT.PREVIEW " + postContent;
        if(!previewCheckBoxElm.checked) // TODO Config
            commandString = "CLOSE put-preview:";

        var socketEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(socketEvent);

        if(!socketEvent.defaultPrevented)
            throw new Error("Socket event for new post was not handled");
    }

    function submitHTTPPutForm(e, formElm) {
        e.preventDefault();

        var passphraseElm = formElm.querySelector('*[name=passphrase][type=password], [type=password]');
        var postContentElm = formElm.querySelector('textarea[name=content]');
        var postContent = postContentElm.value.trim();
        if(!postContent.length)
            throw new Error ("Empty post content");

        var pgpIDPrivateElm = formElm.querySelector('*[name=pgp_id_private]');
        if(!pgpIDPrivateElm.value)
            throw new Error("Invalid Private Key ID");
        var pathElm = formElm.querySelector('*[name=path]');
        if(!pathElm)
            throw new Error("No channel field found");
        var optionSplit = pgpIDPrivateElm.value.split(',');
        var selectedPrivateKeyID = optionSplit[0];
        var selectedPublicKeyID = optionSplit[1];

        // Query private key
        var path = 'http://' + selectedPublicKeyID + '.ks/.private/id';
        KeySpaceDB.queryOne(path, function(err, privateKeyBlock) {
            if(err)
                throw new Error(err);
            if(!privateKeyBlock)
                throw new Error("Private key not found: " + selectedPrivateKeyID);

            var passphrase = passphraseElm.value || '';
            var privateKey = openpgp.key.readArmored(privateKeyBlock).keys[0];
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

            var author = privateKey.getUserIds()[0];
            var fixedPostPath = fixHomePath(pathElm.value, selectedPublicKeyID);
            if(fixedPostPath[0] !== '/')
                fixedPostPath = '/' + fixedPostPath;

            var timestamp = Date.now();

            var contentDiv = document.createElement('div');
            contentDiv.innerHTML = postContent;
            var articleElm = contentDiv.querySelector('article');
            if(!articleElm) {
                contentDiv.innerHTML = "<article>" + contentDiv.innerHTML + "</article>";
                articleElm = contentDiv.querySelector('article');
            }
            articleElm.setAttribute('data-author', author);
            articleElm.setAttribute('data-path', fixedPostPath);
            articleElm.setAttribute('data-timestamp', timestamp.toString());
            postContent = articleElm.outerHTML;
            postContent = protectHTMLContent(postContent, formElm);

            setStatus(formElm, "<span class='command'>Encrypt</span>ing content...");
            openpgp.encryptMessage(privateKey, postContent)
                .then(function(pgpEncryptedString) {
                setStatus(formElm, "Adding post to database...");

                var pgpEncryptedMessage = openpgp.message.readArmored(pgpEncryptedString);

                KeySpaceDB.addVerifiedContentToDB(pgpEncryptedString, selectedPublicKeyID, fixedPostPath, timestamp, {}, function(err, insertData) {
                    if(err)
                        throw new Error(err);

                    var commandString = "PUT " + fixedPostPath + " " + pgpEncryptedString;

                    var socketEvent = new CustomEvent('command', {
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

    function submitHTTPBrowserNavigationForm(e, formElm) {
        var urlElm = formElm.querySelector('[name=url]');
        if(!urlElm)
            throw new Error("Could not find url input");
        if(!urlElm.value)
            return;

        var browserID = null;
        var targetElm = e.target || formElm;
        while(!browserID && (targetElm = targetElm.parentNode))
            browserID = targetElm.getAttribute('data-browser-id');
        if(!browserID)
            throw new Error("Browser ID not found");

        var commandString = "GET " + urlElm.value;
        commandString = addContentHeader(commandString, 'Browser-ID', browserID);

        var commandEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable: true,
            bubbles: true
        });
        e.target.dispatchEvent(commandEvent);

    }


    function verifyEncryptedContent(pgpMessageContent, callback) {
        var openpgp = self.openpgp;
        if(typeof self.openpgp === 'undefined')
            openpgp = require('openpgp');

        var pgpEncryptedMessage = openpgp.message.readArmored(pgpMessageContent);
        var encIDs = pgpEncryptedMessage.getEncryptionKeyIds();
        var pgp_id_public = encIDs[0].toHex().toUpperCase();

        // Query public key
        var path = 'http://' + pgp_id_public + '.ks/public/id';
        KeySpaceDB.queryOne(path, function(err, publicKeyBlock) {
            if(err)
                throw new Error(err);
            if(!publicKeyBlock)
                throw new Error("Public key not found: " + pgp_id_public);

            var publicKey = openpgp.key.readArmored(publicKeyBlock);

            openpgp.verifyClearSignedMessage(publicKey.keys, pgpEncryptedMessage)
                .then(function(verifiedContent) {
                    for(var i=0; i<verifiedContent.signatures.length; i++)
                        if(!verifiedContent.signatures[i].valid)
                            throw new Error("Invalid Signature: " + verifiedContent.signatures[i].keyid.toHex().toUpperCase());

                    verifiedContent.encrypted = pgpMessageContent;
                    verifiedContent.signingKeyId = pgp_id_public;
                    callback(null, verifiedContent);
                })
                .catch(function(err) {
                    callback(err, null);
                });
        });
    }

    function verifyAndAddContentToDB(pgpEncryptedPost, callback) {
        verifyEncryptedContent(pgpEncryptedPost,
            function(err, verifiedContent) {
                if(err)
                    throw new Error(err);

                var openpgp = self.openpgp;
                if(typeof openpgp === 'undefined')
                    openpgp = require('openpgp');

                var pgpEncryptedMessage = openpgp.message.readArmored(pgpEncryptedPost);
                var encIDs = pgpEncryptedMessage.getEncryptionKeyIds();
                var pgp_id_public = encIDs[0].toHex().toUpperCase();

                var path = /data-path=["'](\S+)["']/i.exec(verifiedContent)[1];
                var timestamp = parseInt(/data-timestamp=["'](\d+)["']/i.exec(verifiedContent)[1]);

                KeySpaceDB.addVerifiedContentToDB(pgpEncryptedPost, pgp_id_public, path, timestamp, {}, callback);
            }
        );
    }


    function protectHTMLContent(htmlContent) {
        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match)
            throw new Error("Dangerous HTML: " + match[2]);

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


    function fixHomePath(channelPath, publicKeyID) {
        publicKeyID = publicKeyID.substr(publicKeyID.length - 8);
        if(channelPath[0] === '~') {
            channelPath = channelPath.substr(1);
            if(!channelPath || channelPath[0] !== '/')
                channelPath = '/' + channelPath;
            channelPath = '/home/' + publicKeyID + channelPath;
        }
        return channelPath;
    }


    function getContentHeader(contentString, headerName) {
        var match = new RegExp('^' + headerName + ': ([^$]+)$', 'mi').exec(contentString.split(/\n\n/)[0]);
        if(!match)
            return null;
        return match[1];
    }

    function addContentHeader(contentString, headerName, headerValue) {
        if(getContentHeader(contentString, headerName))
            throw new Error("Content already has Header: " + headerName);
        var lines = contentString.split(/\n/);
        lines.splice(lines.length >= 1 ? 1 : 0, 0, headerName + ": " + headerValue);
        return lines.join("\n");
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

    // For HTTP Content Database access
    includeScript('ks/ks-db.js');

    // For PGP Decryption in chat rooms
    //var openPGPScriptPath = 'pgp/lib/openpgpjs/openpgp.js';
    //includeScript(openPGPScriptPath, function() {
    //
    //    var timeout = setInterval(function() {
    //        var src = openPGPScriptPath.replace('/openpgp.', '/openpgp.worker.');
    //        if(!window.openpgp || window.openpgp._worker_init)
    //            return;
    //        window.openpgp.initWorker(src);
    //        window.openpgp._worker_init = true;
    //        clearInterval(timeout);
    //        //console.info("OpenPGP Worker Loaded: " + src);
    //    }, 500);
    //});
})();

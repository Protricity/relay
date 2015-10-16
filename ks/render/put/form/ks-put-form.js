/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object')
(function() {

    var REFRESH_TIMEOUT = 20;

    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('input', onFormEvent);
    self.addEventListener('change', onFormEvent);
    self.addEventListener('render', function(e) {
        var formElm = e.target.querySelector('form[name^=ks-put-form]');
        if(formElm)
            onFormEvent(e, formElm);
    });

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

            default:
                return false;
        }
    }

    var lastPostContent = null;
    function refreshHTTPPutForm(e, formElm) {
        var pgp_id_public = formElm.pgp_id_public.value.split(',')[0];
        var passphrase_required = formElm.pgp_id_public.value.split(',')[1] === '1';
        var passphrase = formElm.passphrase.value;

        formElm.put.disabled = passphrase_required;
        formElm.classList[!passphrase_required ? 'add' : 'remove']('no-passphrase-required');

        formElm.parentNode.parentNode.classList[formElm.content.value.length === 0 ? 'add' : 'remove']('compact');
        if(!lastPostContent || lastPostContent != formElm.content.value || e.type === 'change') {
            lastPostContent = formElm.content.value;

            if(refreshHTTPPutForm.previewTimeout)
                clearTimeout(refreshHTTPPutForm.previewTimeout);
            refreshHTTPPutForm.previewTimeout = setTimeout(function() {
                updatePutPreview(e, formElm);
            }, REFRESH_TIMEOUT)
        }

        // TODO: test passphrase
    }


    function submitHTTPPutForm(e, formElm) {
        e.preventDefault();
        var pgp_id_public = formElm.pgp_id_public.value.split(',')[0];
        var passphrase_required = formElm.pgp_id_public.value.split(',')[1] === '1';
        var passphrase = formElm.passphrase.value;

        var pathElm = formElm.querySelector('*[name=path]');
        if (!pathElm)
            throw new Error("No channel field found");

        //var commandString = "PUT " + pathElm.value.trim() + " " + formElm.content.value.trim();

        //var socketEvent = new CustomEvent('command', {
        //    detail: commandString,
        //    cancelable: true,
        //    bubbles: true
        //});
        //formElm.dispatchEvent(socketEvent);



        //// Query private key
        //var path = 'http://' + selectedPublicKeyID + '.ks/.private/id';
        //KeySpaceDB.queryOne(path, function (err, privateKeyBlock) {
        //    if (err)
        //        throw new Error(err);
        //    if (!privateKeyBlock)
        //        throw new Error("Private key not found: " + selectedPrivateKeyID);
        //
        //    var privateKey = openpgp.key.readArmored(privateKeyBlock).keys[0];
        //    if (!privateKey.primaryKey.isDecrypted)
        //        if (passphrase)
        //            privateKey.primaryKey.decrypt(passphrase);
        //
        //    if (!privateKey.primaryKey.isDecrypted) {
        //        var errMSG = passphrase === ''
        //            ? 'PGP key pair requires a passphrase'
        //            : 'Invalid PGP passphrase';
        //        //setStatus(formElm, "<span class='error'>" + errMSG + "</span>", 2, true);
        //        formElm.passphrase.focus();
        //        throw new Error(errMSG);
        //    }

            //    var author = privateKey.getUserIds()[0];
            //    var fixedPostPath = fixHomePath(pathElm.value, selectedPublicKeyID);
            //    if (fixedPostPath[0] !== '/')
            //        fixedPostPath = '/' + fixedPostPath;
            //
            //    var timestamp = Date.now();
            //
            //    var contentDiv = document.createElement('div');
            //    contentDiv.innerHTML = postContent;
            //    var articleElm = contentDiv.querySelector('article');
            //    if (!articleElm) {
            //        contentDiv.innerHTML = "<article>" + contentDiv.innerHTML + "</article>";
            //        articleElm = contentDiv.querySelector('article');
            //    }
            //    articleElm.setAttribute('data-author', author);
            //    articleElm.setAttribute('data-path', fixedPostPath);
            //    articleElm.setAttribute('data-timestamp', timestamp.toString());
            //    postContent = articleElm.outerHTML;
            //    postContent = protectHTMLContent(postContent, formElm);
            //
            //    setStatus(formElm, "<span class='command'>Encrypt</span>ing content...");
            //    openpgp.encryptMessage(privateKey, postContent)
            //        .then(function (pgpEncryptedString) {
            //            setStatus(formElm, "Adding post to database...");
            //
            //            var pgpEncryptedMessage = openpgp.message.readArmored(pgpEncryptedString);
            //
            //            KeySpaceDB.addVerifiedContentToDB(pgpEncryptedString, selectedPublicKeyID, fixedPostPath, timestamp, {}, function (err, insertData) {
            //                if (err)
            //                    throw new Error(err);
            //
            //                var commandString = "PUT " + fixedPostPath + " " + pgpEncryptedString;
            //
            //                var socketEvent = new CustomEvent('command', {
            //                    detail: commandString,
            //                    cancelable: true,
            //                    bubbles: true
            //                });
            //                formElm.dispatchEvent(socketEvent);
            //
            //                if (!socketEvent.defaultPrevented)
            //                    throw new Error("Socket event for new post was not handled");
            //
            //                setStatus(formElm, "<span class='command'>Put</span> <span class='success'>Successful</span>");
            //                postContentElm.value = '';
            //            });
            //        });
            //});
    }

    function updatePutPreview(e, formElm) {
        var postContentElm = formElm.querySelector('textarea[name=content]');
        var pathElm = formElm.querySelector('*[name=path]');
        if(!pathElm)
            throw new Error("No channel field found");

        var timestamp = Date.now();

        var postContent = postContentElm.value.trim();
        //if(!postContent.length)
        //    return false;

        var contentDiv = document.createElement('div');
        contentDiv.innerHTML = postContent;
        var articleElm = contentDiv.querySelector('article');
        if(!articleElm) {
            contentDiv.innerHTML = "<article>" + contentDiv.innerHTML + "</article>";
            articleElm = contentDiv.querySelector('article');
        }
        articleElm.setAttribute('data-path', pathElm);
        articleElm.setAttribute('data-timestamp', timestamp.toString());

        postContent = articleElm.outerHTML;
        postContent = protectHTMLContent(postContent, formElm);

        var commandString = "PUT.PREVIEW " + postContent;
        var socketEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(socketEvent);

        if(!socketEvent.defaultPrevented)
            throw new Error("Socket event for new post was not handled");
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

})();

// Worker Script
else
    (function() {
        var TEMPLATE_URL = 'ks/render/put/form/ks-put-form.html';

        module.exports.renderPutForm = function(content, callback) {
            self.module = {exports: {}};
            importScripts('ks/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            var contentEscaped = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

            // Query private key
            var path = '/.private/id';
            var html_pgp_id_public_options = '';
            KeySpaceDB.queryAll(path, function(err, contentEntry) {
                if(err)
                    throw new Error(err);

                if(contentEntry) {
                    html_pgp_id_public_options +=
                        "<option value='" + contentEntry.pgp_id_public + ',' + (contentEntry.passphrase_required?1:0) + "'>" +
                        contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8) + ' ' + contentEntry.user_id +
                        "</option>";

                } else {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", TEMPLATE_URL);
                    xhr.onload = function () {
                        callback(xhr.responseText
                            .replace(/{\$content}/gi, content)
                            .replace(/{\$content_escaped}/gi, contentEscaped)
                            .replace(/{\$html_pgp_id_public_options}/gi, html_pgp_id_public_options)
                        );
                    };
                    xhr.send();
                    // Free up template resources
                    //delete Templates.pgp.manage;
                }
            });

            return true;
        };
    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
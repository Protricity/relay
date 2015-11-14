/**
 * Created by ari on 7/2/2015.
 */
if(typeof document === 'object')
(function() {

    document.addEventListener('submit', onFormEvent, false);

    document.addEventListener('render', onRenderEvent, false);
    setTimeout(onRenderEvent, 200);


    var voteArticles = document.getElementsByClassName('app-vote:');
    var voteArticlesProcessed = document.getElementsByClassName('app-vote: processed');
    function onRenderEvent(e) {
        if(voteArticles.length <= voteArticlesProcessed.length)
            return;

        for(var i=0; i<voteArticles.length; i++)
            processVoteArticle(voteArticles[i]);
    }


    function onFormEvent(e, formElm) {
        if (!formElm) formElm = e.target.form ? e.target.form : e.target;
        if (formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch (formElm.getAttribute('name')) {
            case 'app-vote-form':
                if (e.type === 'submit')
                    e.preventDefault() ||
                    submitVoteForm(e, formElm);
                return true;
        }
    }


    function submitVoteForm(e, formElm) {

        // User Values
        var user_identity = formElm.user_pgp_id_public.value.split(',');
        if(!user_identity)
            throw new Error("Invalid pgp_id_public");

        var user_passphrase = formElm.user_passphrase.value;

        var user_pgp_id_public = user_identity[0];
        var user_username = user_identity[1];
        var user_passphrase_required = user_identity[2];

        var user_choice = formElm.user_choice.value;
        if(!user_choice)
            throw new Error("Invalid choice");

        // Vote Values
        var vote_pgp_id_public = formElm.vote_pgp_id_public.value;
        if(!vote_pgp_id_public)
            throw new Error("Invalid Vote Entry PGP Key ID")

        var vote_timestamp = formElm.vote_timestamp.value;
        if(!vote_timestamp)
            throw new Error("Invalid Vote Entry timestamp");

        //formElm.submit_vote.disabled = true;
        // TODO: Query Vote Content


        // Query Vote Public Key for encrypting
        var path = 'http://' + vote_pgp_id_public + '.ks/public/id';
        KeySpaceDB.queryOne(path, function (err, publicKeyBlock) {
            if (err)
                throw new Error(err);
            if (!publicKeyBlock)
                throw new Error("Vote Public key not found: " + user_pgp_id_public);

            var publicKeyForEncryption = openpgp.key.readArmored(publicKeyBlock.content).keys[0];


            // Query user private key for signing
            var path = 'http://' + user_pgp_id_public + '.ks/.private/id';
            KeySpaceDB.queryOne(path, function (err, privateKeyBlock) {
                if (err)
                    throw new Error(err);
                if (!privateKeyBlock)
                    throw new Error("User Private key not found: " + user_pgp_id_public);

                var privateKeyForSigning = openpgp.key.readArmored(privateKeyBlock.content).keys[0];


                if (!privateKeyForSigning.primaryKey.isDecrypted)
                    if (user_passphrase)
                        privateKeyForSigning.primaryKey.decrypt(user_passphrase);

                if (!privateKeyForSigning.primaryKey.isDecrypted) {
                    var errMSG = user_passphrase === ''
                        ? 'PGP key pair requires a passphrase'
                        : 'Invalid PGP passphrase';
                    //statusBoxElm.innerHTML = "<span class='error'>" + errMSG + "</span>";
                    console.error(errMSG);
                    formElm.passphrase.focus();
                    throw new Error(errMSG);
                }

                openpgp.signAndEncryptMessage(publicKeyForEncryption, privateKeyForSigning, user_choice)
                    .then(function (pgpSignedContent) {

                        console.log("TODO: ", pgpSignedContent);
                        formElm.classList.add('success');

                    });
            });

        });

        //var commandString = "VOTE " + user_pgp_id_public + ' ' + vote_timestamp + ' ' + user_choice;
        //
        //var socketEvent = new CustomEvent('command', {
        //    detail: commandString,
        //    cancelable:true,
        //    bubbles:true
        //});
        //formElm.dispatchEvent(socketEvent);
        //if(!socketEvent.defaultPrevented)
        //    throw new Error("Command was not received");

        return false;
    }

    // signAndEncryptMessage

    function queryPublicKey(pgp_id_public, callback) {

        var path = 'http://' + pgp_id_public + '.ks/public/id';
        KeySpaceDB.queryOne(path, function (err, publicKeyBlock) {
            if (err)
                throw new Error(err);
            if (!publicKeyBlock)
                throw new Error("Public key not found: " + pgp_id_public);

            var publicKey = openpgp.key.readArmored(publicKeyBlock.content).keys[0];
            callback(publicKey);
        });
    }

    function queryPrivateKey(pgp_id_public, callback) {

    }

    function encryptAndSign(postContent, privateKey, passphrase) {

        //var publicKey = privateKey.toPublic();
        //
        //if (!privateKey.primaryKey.isDecrypted)
        //    if (passphrase)
        //        privateKey.primaryKey.decrypt(passphrase);
        //
        //if (!privateKey.primaryKey.isDecrypted) {
        //    var errMSG = passphrase === ''
        //        ? 'PGP key pair requires a passphrase'
        //        : 'Invalid PGP passphrase';
        //    statusBoxElm.innerHTML = "<span class='error'>" + errMSG + "</span>";
        //    formElm.passphrase.focus();
        //    throw new Error(errMSG);
        //}


        //statusBoxElm.innerHTML = "<span class='command'>Encrypt</span>ing content...";

        openpgp.signClearMessage(privateKey, postContent)
            .then(function (pgpSignedContent) {
                var pgpClearSignedMessage = openpgp.cleartext.readArmored(pgpSignedContent);

                ////Add PublicKeyEncryptedSessionKey
                //var symAlgo = openpgp.key.getPreferredSymAlgo(privateKey);
                //var encryptionKeyPacket = privateKey.getEncryptionKeyPacket();
                //if (encryptionKeyPacket) {
                //    var pkESKeyPacket = new openpgp.packet.PublicKeyEncryptedSessionKey();
                //    pkESKeyPacket.publicKeyId = encryptionKeyPacket.getKeyId();
                //    pkESKeyPacket.publicKeyAlgorithm = encryptionKeyPacket.algorithm;
                //    pkESKeyPacket.sessionKey = publicKey;
                //    pkESKeyPacket.sessionKeyAlgorithm = openpgp.enums.read(openpgp.enums.symmetric, symAlgo);
                //    pkESKeyPacket.encrypt(encryptionKeyPacket);
                //    pgpClearSignedMessage.packets.push(pkESKeyPacket);
                //
                //} else {
                //    throw new Error('Could not find valid key packet for encryption in key ' + key.primaryKey.getKeyId().toHex());
                //}
                //
                //var finalPGPSignedContent = pgpClearSignedMessage.armor();
                ////console.log(pgpSignedContent, finalPGPSignedContent);

                //var commandString = "PUT " + pgp_id_public + "\n" + pgpSignedContent; // finalPGPSignedContent;
                //
                //var socketEvent = new CustomEvent('command', {
                //    detail: commandString,
                //    cancelable: true,
                //    bubbles: true
                //});
                //formElm.dispatchEvent(socketEvent);
                //
                //if (!socketEvent.defaultPrevented)
                //    throw new Error("Socket event for new post was not handled");
                //
                //statusBoxElm.innerHTML = "<span class='command'>Put</span> <span class='success'>Successful</span>";
                //formElm.content.value = '';
                //
                //// Close Form
                //var windowElm = document.getElementsByClassName('ks-put:')[0];
                //windowElm.classList.add('closed');
                //
                //commandString = 'PUT.MANAGE http://' + pgp_id_public + '.ks/' + contentPath;
                //
                //socketEvent = new CustomEvent('command', {
                //    detail: commandString,
                //    cancelable: true,
                //    bubbles: true
                //});
                //formElm.dispatchEvent(socketEvent);
                //
                //if (!socketEvent.defaultPrevented)
                //    throw new Error("Socket event for new post was not handled");

            });
    }


    function encrypt(postContent, privateKey, passphrase) {

        var publicKey = privateKey.toPublic();

        if (!privateKey.primaryKey.isDecrypted)
            if (passphrase)
                privateKey.primaryKey.decrypt(passphrase);

        if (!privateKey.primaryKey.isDecrypted) {
            var errMSG = passphrase === ''
                ? 'PGP key pair requires a passphrase'
                : 'Invalid PGP passphrase';
            statusBoxElm.innerHTML = "<span class='error'>" + errMSG + "</span>";
            formElm.passphrase.focus();
            throw new Error(errMSG);
        }


        //statusBoxElm.innerHTML = "<span class='command'>Encrypt</span>ing content...";

        openpgp.signClearMessage(privateKey, postContent)
            .then(function (pgpSignedContent) {
                var pgpClearSignedMessage = openpgp.cleartext.readArmored(pgpSignedContent);

                //Add PublicKeyEncryptedSessionKey
                var symAlgo = openpgp.key.getPreferredSymAlgo(privateKey);
                var encryptionKeyPacket = privateKey.getEncryptionKeyPacket();
                if (encryptionKeyPacket) {
                    var pkESKeyPacket = new openpgp.packet.PublicKeyEncryptedSessionKey();
                    pkESKeyPacket.publicKeyId = encryptionKeyPacket.getKeyId();
                    pkESKeyPacket.publicKeyAlgorithm = encryptionKeyPacket.algorithm;
                    pkESKeyPacket.sessionKey = publicKey;
                    pkESKeyPacket.sessionKeyAlgorithm = openpgp.enums.read(openpgp.enums.symmetric, symAlgo);
                    pkESKeyPacket.encrypt(encryptionKeyPacket);
                    pgpClearSignedMessage.packets.push(pkESKeyPacket);

                } else {
                    throw new Error('Could not find valid key packet for encryption in key ' + key.primaryKey.getKeyId().toHex());
                }

                var finalPGPSignedContent = pgpClearSignedMessage.armor();
                //console.log(pgpSignedContent, finalPGPSignedContent);

                var commandString = "PUT " + pgp_id_public + "\n" + pgpSignedContent; // finalPGPSignedContent;

                var socketEvent = new CustomEvent('command', {
                    detail: commandString,
                    cancelable: true,
                    bubbles: true
                });
                formElm.dispatchEvent(socketEvent);

                if (!socketEvent.defaultPrevented)
                    throw new Error("Socket event for new post was not handled");

                statusBoxElm.innerHTML = "<span class='command'>Put</span> <span class='success'>Successful</span>";
                formElm.content.value = '';

                // Close Form
                var windowElm = document.getElementsByClassName('ks-put:')[0];
                windowElm.classList.add('closed');

                commandString = 'PUT.MANAGE http://' + pgp_id_public + '.ks/' + contentPath;

                socketEvent = new CustomEvent('command', {
                    detail: commandString,
                    cancelable: true,
                    bubbles: true
                });
                formElm.dispatchEvent(socketEvent);

                if (!socketEvent.defaultPrevented)
                    throw new Error("Socket event for new post was not handled");

            });
    }


    var URL_VOTE_FORM_TEMPLATE = 'app/social/vote/form/app-vote-form.html';
    var URL_VOTE_FORM_SCRIPT = 'app/social/vote/form/app-vote-form.js';
    var URL_VOTE_FORM_STYLESHEET = 'app/social/vote/form/app-vote-form.css';

    function processVoteArticle(voteElement) {
        if(voteElement.classList.contains('processed')
            || voteElement.classList.contains('processing'))
            return false;
        voteElement.classList.add('processing');

        var voteContainerElm = voteElement.parentNode;
        if(voteContainerElm.classList.contains('disable-app-vote-form'))
            return;

        var vote_pgp_id_public = voteContainerElm.getAttribute('data-pgp-id-public');
        if(!vote_pgp_id_public)
            throw new Error("No PGP ID found");
        var vote_timestamp = voteContainerElm.getAttribute('data-timestamp');
        if(!vote_timestamp)
            throw new Error("No Timestamp found");

        //var uid = pgp_id_public + ' ' + timestamp;

        var choiceElms = voteElement.getElementsByClassName('app-vote-choice:');

        var html_choice_options = [];
        var choiceN=1;
        for(var ci=0; ci<choiceElms.length; ci++) {
            var choiceElm = choiceElms[ci];
            var titleElm = choiceElm.querySelector('header') || choiceElm;
            var title = titleElm.innerHTML.replace(/(<([^>]+)>)/ig,"");
            html_choice_options.push("<option value='" + (ci + 1) + "'>" + (choiceN++) + '. ' + title + "</option>");
            html_choice_options.sort(function() {
                return .5 - Math.random();
            });
        }


        // Refresh pgp identities

        var default_pgp_id_public = null;
        queryPGPIdentities(default_pgp_id_public, function(html_pgp_id_public_options) {
            var xhr = new XMLHttpRequest();
            xhr.addEventListener("load", function() {
                if(xhr.status !== 200)
                    throw new Error("Error: " + xhr.responseText);

                voteContainerElm.innerHTML +=
                    "<hr/>" +
                    xhr.responseText
                        .replace(/{\$html_pgp_id_public_options}/gi, html_pgp_id_public_options)
                        .replace(/{\$status_box}/gi, '')
                        .replace(/{\$vote_pgp_id_public}/gi, vote_pgp_id_public)
                        .replace(/{\$vote_timestamp}/gi, vote_timestamp)
                        .replace(/{\$html_choice_options}/gi, html_choice_options.join("\n"));

                includeScript(URL_VOTE_FORM_SCRIPT);
                includeStylesheet(URL_VOTE_FORM_STYLESHEET);

                voteElement.classList.remove('processing');
                voteElement.classList.add('processed');

                console.log("Processed vote with " + choiceElms.length + " choices");
            });
            xhr.open("GET", URL_VOTE_FORM_TEMPLATE);
            xhr.send();

        });

        return true;
    }

    function queryPGPIdentities(default_pgp_id_public, callback) {

        var queryPath = '/.private/id';
        var html_pgp_id_public_options = ''; // "<option value=''>Select a PGP Identity</option>";
        var idCount = 0;
        KeySpaceDB.queryAll(queryPath, function(err, contentEntry) {
            if(err)
                throw new Error(err);

            if(contentEntry) {
                if(!default_pgp_id_public)
                    default_pgp_id_public = contentEntry.pgp_id_public;

                var optionValue = contentEntry.pgp_id_public +
                    ',' + contentEntry.user_id +
                    ',' + (contentEntry.passphrase_required?1:0);

                html_pgp_id_public_options +=
                    "<option value='" + optionValue + "'" +
                    (default_pgp_id_public === contentEntry.pgp_id_public ? ' selected="selected"' : '') +
                    ">" +
                    (contentEntry.passphrase_required?'* ':'&nbsp;  ') +
                    contentEntry.user_id +
                    ' - ' +
                    contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8) +
                    "</option>";

                idCount++;

            } else {
                callback(html_pgp_id_public_options, idCount);
            }
        });
    }

    // Includes

    function includeScript(jsPath) {
        var head = document.getElementsByTagName('head')[0];
        if (head.querySelectorAll('script[src=' + jsPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
            var newScript = document.createElement('script');
            newScript.setAttribute('src', jsPath);
            head.appendChild(newScript);
        }
    }

    function includeStylesheet(cssPath) {
        var head = document.getElementsByTagName('head')[0];
        if (head.querySelectorAll('link[href=' + cssPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
            var newLink = document.createElement('link');
            newLink.setAttribute('href', cssPath);
            newLink.setAttribute('rel', 'stylesheet');
            newLink.setAttribute('type', 'text/css');
            head.appendChild(newLink);
        }
    }

    // For Public/Private Key Database access
    includeScript('ks/ks-db.js');
})();



//if(typeof module === 'object') (function() {
//    module.exports.initClientAppSocialVoteCommands = function (Client) {
//
//    };
//
//})();
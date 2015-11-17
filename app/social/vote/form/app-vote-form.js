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
        formElm.classList.remove('success');

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

        var voteContent =
            "<article " +
                "class='app-vote-entry:' " +
                "data-re='" + vote_pgp_id_public + ' ' + vote_timestamp + "' " +
                "data-voter-id='" + user_pgp_id_public + "' " +
                "data-timestamp='" + Date.now() + "'>" +
                user_choice +
            "</article>";
        console.log(voteContent);

        // Query Vote Content
        KeySpaceDB.getContent(vote_pgp_id_public, vote_timestamp, function (err, voteEntryData) {
            if (err)
                throw new Error(err);

            if (!voteEntryData)
                throw new Error("Vote Entry missing: " + vote_pgp_id_public + ' ' + vote_timestamp);


            // Query Vote Public Key for encrypting
            var path = 'http://' + vote_pgp_id_public + '.ks/public/id';
            KeySpaceDB.queryOne(path, function (err, publicKeyBlock) {
                if (err)
                    throw new Error(err);
                if (!publicKeyBlock)
                    throw new Error("Vote Public key not found: " + user_pgp_id_public);

                var publicKeysForEncryption = openpgp.key.readArmored(publicKeyBlock.content).keys;


                // Query user private key for signing
                var path = 'http://' + user_pgp_id_public + '.ks/.private/id';
                KeySpaceDB.queryOne(path, function (err, privateKeyBlock) {
                    if (err)
                        throw new Error(err);
                    if (!privateKeyBlock)
                        throw new Error("User Private key not found: " + user_pgp_id_public);

                    var privateKeyForSigning = openpgp.key.readArmored(privateKeyBlock.content).keys[0];
                    publicKeysForEncryption.push(privateKeyForSigning.toPublic());
                    // TODO: unique pk

                    if (!privateKeyForSigning.primaryKey.isDecrypted)
                        if (user_passphrase)
                            privateKeyForSigning.primaryKey.decrypt(user_passphrase);

                    if (!privateKeyForSigning.primaryKey.isDecrypted) {
                        var errMSG = user_passphrase === ''
                            ? 'PGP key pair requires a passphrase'
                            : 'Invalid PGP passphrase';
                        formElm.getElementsByClassName('status-box')[0].innerHTML = "<span class='error'>" + errMSG + "</span>";
                        formElm.passphrase.focus();
                        throw new Error(errMSG);
                    }

//                     console.log("Public keys ", publicKeysForEncryption);

                    openpgp.signAndEncryptMessage(publicKeysForEncryption, privateKeyForSigning, voteContent)
                        .then(function (pgpEncryptedMessage) {

                            formElm.classList.add('success');

                            var commandString = "PUT " + user_pgp_id_public + "\n" + pgpEncryptedMessage; // finalPGPSignedContent;

                            var socketEvent = new CustomEvent('command', {
                                detail: commandString,
                                cancelable: true,
                                bubbles: true
                            });
                            formElm.dispatchEvent(socketEvent);

                            if (!socketEvent.defaultPrevented)
                                throw new Error("Socket event for vote was not handled");

                            formElm.getElementsByClassName('status-box')[0].innerHTML = "<span class='command'>Vote</span> <span class='success'>Successful</span>";
                            formElm.submit_vote.value = "Change Vote";
                        });
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

    var CLASS_BALLOT = 'app-vote:';
    var CLASS_BALLOT_CHOICE = 'app-vote-choice:';
    //var CLASS_BALLOT_ENTRY = 'app-vote-entry:';

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
                var xhr = new XMLHttpRequest();

                xhr.addEventListener("load", function () {
                    if (xhr.status !== 200)
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
            }
        });

        return true;
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
    includeScript('keyspace/ks-db.js');
})();



//if(typeof module === 'object') (function() {
//    module.exports.initClientAppSocialVoteCommands = function (Client) {
//
//    };
//
//})();
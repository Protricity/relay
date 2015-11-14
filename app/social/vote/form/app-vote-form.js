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

        var split = formElm.pgp_id_public.value.split(',');
        if(!split)
            throw new Error("Invalid pgp_id_public");

        var pgp_id_public = split[0];
        var username = split[1];
        var passphrase_required = split[2];

        var choice = formElm.choice.value;
        if(!choice)
            throw new Error("Invalid choice");

        var timestamp = formElm.timestamp.value;
        if(!timestamp)
            throw new Error("Invalid vote entry timestamp");

        var commandString = "VOTE " + pgp_id_public + ' ' + timestamp + ' ' + choice;

        var socketEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(socketEvent);
        if(!socketEvent.defaultPrevented)
            throw new Error("Command was not received");

        formElm.classList.add('success');
//         formElm.submit_vote.disabled = true;
        console.log("TODO: ", commandString);
        return false;
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

        var pgp_id_public = voteContainerElm.getAttribute('data-pgp-id-public');
        if(!pgp_id_public)
            throw new Error("No PGP ID found");
        var timestamp = voteContainerElm.getAttribute('data-timestamp');
        if(!timestamp)
            throw new Error("No Timestamp found");

        //var uid = pgp_id_public + ' ' + timestamp;

        var choiceElms = voteElement.getElementsByClassName('app-vote-choice:');

        var html_options = [];
        var choiceN=1;
        for(var ci=0; ci<choiceElms.length; ci++) {
            var choiceElm = choiceElms[ci];
            var titleElm = choiceElm.querySelector('header') || choiceElm;
            var title = titleElm.innerHTML.replace(/(<([^>]+)>)/ig,"");
            html_options.push("<option value='" + (ci + 1) + "'>" + (choiceN++) + '. ' + title + "</option>");
            html_options.sort(function() {
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
                        .replace(/{\$pgp_id_public}/gi, pgp_id_public)
                        .replace(/{\$timestamp}/gi, timestamp)
                        .replace(/{\$html_options}/gi, html_options.join("\n"));

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
/**
 * Created by ari on 7/2/2015.
 */
if(typeof document === 'object')
(function() {

    var FORM_VOTE_TEMPLATE =
        "<form name='app-vote-form'>" +
            "<hr>" +
            "<select name='choice' oninput='this.form.submit_vote.click()'>" +
                "<option value=''>Select your Voter Choice</option>" +
                "{$html_options}" +
            "</select>" +
            "<input type='submit' value='Vote!' name='submit_vote'>" +
            "<a href='#VOTE {$pgp_id_public} {$timestamp}' style='float: right;'>View...</a>" +
        "</form>";

    // Events

    document.addEventListener('render', onRenderEvent, false);
    setTimeout(onRenderEvent, 200);



    document.addEventListener('submit', onFormEvent, false);

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
        console.log(formElm.choice.value);
    }


    var voteArticles = document.getElementsByClassName('app-vote:');
    var voteArticlesProcessed = document.getElementsByClassName('app-vote: processed');
    function onRenderEvent(e) {
        if(voteArticles.length <= voteArticlesProcessed.length)
            return;

        for(var i=0; i<voteArticles.length; i++)
            processVoteArticle(voteArticles[i]);
    }



    function processVoteArticle(voteElement) {
        if(voteElement.classList.contains('processed')
            || voteElement.classList.contains('processing'))
            return false;
        voteElement.classList.add('processing');

        var voteContainerElm = voteElement.parentNode;

        var pgp_id_public = voteContainerElm.getAttribute('data-pgp-id-public');
        if(!pgp_id_public)
            throw new Error("No PGP ID found");
        var timestamp = voteContainerElm.getAttribute('data-timestamp');
        if(!timestamp)
            throw new Error("No Timestamp found");

        //var uid = pgp_id_public + ' ' + timestamp;

        var choiceElms = voteElement.getElementsByClassName('app-vote-choice:');

        var html_options = [];
        var oi=1;
        for(var ci=0; ci<choiceElms.length; ci++) {
            var choiceElm = choiceElms[ci];
            var titleElm = choiceElm.querySelector('header') || choiceElm;
            var title = titleElm.innerHTML.replace(/(<([^>]+)>)/ig,"");
            html_options.push("<option value='" + (ci + 1) + "'>" + (oi++) + '. ' + title + "</option>");
            html_options.sort(function() {
                return .5 - Math.random();
            });
        }

        voteContainerElm.innerHTML += FORM_VOTE_TEMPLATE
            .replace(/{\$pgp_id_public}/gi, pgp_id_public)
            .replace(/{\$timestamp}/gi, timestamp)
            .replace(/{\$html_options}/gi, html_options.join("\n"));

        voteElement.classList.remove('processing');
        voteElement.classList.add('processed');

        console.log("Processed vote with " + choiceElms.length + " choices");
        return true;
    }

    // Includes

    function includeScript(scriptPath) {
        var head = document.getElementsByTagName('head')[0];
        if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
            var newScript = document.createElement('script');
            newScript.setAttribute('src', scriptPath);
            head.appendChild(newScript);
        }
    }

    // For Public/Private Key Database access
    includeScript('ks/ks-db.js');
})();



if(typeof module === 'object') (function() {
    module.exports.initClientAppSocialVoteCommands = function (Client) {

        Client.addCommand(voteCommand);

        /**
         *
         * @param commandString VOTE
         */
        function voteCommand(commandString) {
            var match = /^vote\s+([a-f0-9]{8,16})\s+(\d+)\s*([\s\S]+)?$/im.exec(commandString);
            if (!match)
                return false;

            var pgp_id_public = match[1];
            var timestamp = match[2];
            var voteContent = match[3];

            self.module = {exports: {}};
            importScripts('app/social/vote/booth/vote-booth.js');
            var renderExports = self.module.exports;

            renderExports.renderVoteBooth(commandString, function (html) {
                Client.render(html);
            });

            return true;
        }
    };

    var TEMPLATE_URL = "app/social/vote/wizard/ks-create-vote-wizard.html";

    module.exports.renderContentScript = function (commandString, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if (xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText);

        return true;
    };
})();
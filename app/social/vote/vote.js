/**
 * Created by ari on 7/2/2015.
 */
if(typeof document === 'object')
(function() {

    // Events

    document.addEventListener('render', onRenderEvent, false);

    var voteArticles = document.getElementsByClassName('app-vote:');
    var voteArticlesProcessed = document.getElementsByClassName('app-vote: processed');
    function onRenderEvent(e) {
        if(voteArticles.length <= voteArticlesProcessed.length)
            return;

        for(var i=0; i<voteArticles.length; i++)
            processVoteArticle(voteArticles[i]);
    }
    setTimeout(onRenderEvent, 200);

    function processVoteArticle(voteElement) {
        if(voteElement.classList.contains('processed'))
            return false;

        var timestamp = voteElement.getAttribute('data-timestamp');
        var pgp_id_public = voteElement.getAttribute('data-pgp-id-public');
        //var uid = pgp_id_public + ' ' + timestamp;

        var choiceElms = voteElement.getElementsByClassName('app-vote-choice:');
        console.log("Found vote with " + choiceElms.length + " choices");


        var selectElm = voteElement.parentNode.querySelector('select[name=choice]');
        if(!selectElm) {
            selectElm = document.createElement('select');
            selectElm.setAttribute('name', 'choice');
            selectElm.classList.add('app-vote-button:');
            //buttonElm.innerHTML = 'Vote';
            //selectElm.onclick = function() { ClientSocketWorker.sendCommand("VOTE " + pgp_id_public + ' ' + timestamp)}
            voteElement.parentNode.appendChild(document.createElement('hr'));
            voteElement.parentNode.appendChild(selectElm);
        }

        //for(var ci=0; ci<choiceElms.length; ci++) {
        //    var choiceElm = choiceElms[ci];
        //}

        voteElement.classList.add('processed');
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
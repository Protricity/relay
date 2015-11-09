/**
 * Created by ari on 7/2/2015.
 */
if(typeof document === 'object')
(function() {

    var URL_VOTE_FORM_SCRIPT = 'app/social/vote/form/app-vote-form.js';

    document.addEventListener('render', onRenderVoteFormProxy, false);
    setTimeout(onRenderVoteFormProxy, 200);


    var voteArticles = document.getElementsByClassName('app-vote:');
    var voteArticlesProcessed = document.getElementsByClassName('app-vote: processed');
    function onRenderVoteFormProxy(e) {
        if(voteArticles.length <= voteArticlesProcessed.length)
            return;

        document.removeEventListener('render', onRenderVoteFormProxy, false);

        var head = document.getElementsByTagName('head')[0];
        if (head.querySelectorAll('script[src=' + URL_VOTE_FORM_SCRIPT.replace(/[/.]/g, '\\$&') + ']').length === 0) {
            var newScript = document.createElement('script');
            newScript.setAttribute('src', URL_VOTE_FORM_SCRIPT);
            head.appendChild(newScript);
        }

    }
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
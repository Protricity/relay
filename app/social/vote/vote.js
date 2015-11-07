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

        for(var i=0; i<voteArticles.length; i++) (function(voteElement) {
            if(voteElement.classList.contains('processed'))
                return;

            var choiceElms = voteElement.getElementsByClassName('app-vote-choice:');
            console.log("Found vote with " + choiceElms.length + " choices");

            //for(var ci=0; ci<choiceElms.length; ci++) {
            //    var choiceElm = choiceElms[ci];
            //}

            var buttonElm = voteElement.querySelector('button');
            if(!buttonElm) {
                buttonElm = document.createElement('button');
                buttonElm.classList.add('app-vote-button:');
                buttonElm.innerHTML = 'Vote';
                voteElement.appendChild(buttonElm);
            }

            voteElement.classList.add('processed');
        })(voteArticles[i]);
    }
    setTimeout(onRenderEvent, 200);


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
            var match = /^vote/im.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('app/social/vote/render/vote-window.js');
            var renderExports = self.module.exports;

            renderExports.renderVote(commandString, function (html) {
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
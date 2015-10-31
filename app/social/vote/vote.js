/**
 * Created by ari on 7/2/2015.
 */
if(typeof document === 'object')
(function() {

    // Events

    document.addEventListener('render', onRenderEvent, false);

    function onRenderEvent(e) {
        var voteElements = document.getElementsByClassName('app.vote');

        for(var i=0; i<voteElements.length; i++) (function(voteElement) {
            var titleElements = voteElement.getElementsByClassName('app.vote.title');
            if(titleElements.length === 0)
                throw new Error('Missing Title: class="app.vote.title"');
            var title = titleElements[0].innerHTML;
            if(!title)
                throw new Error('Empty Title Element: class="app.vote.title"');

            var optionElements = voteElement.getElementsByClassName('app.vote.option');
            if(optionElements.length === 0)
                throw new Error('Missing Option Elements: class="app.vote.option"');

            var options = {};
            for(var i=0; i<optionElements.length; i++) (function(optionElement) {
                var optionID = optionElement.getAttribute('data-option-id');
                if(!optionID)
                    throw new Error('Missing Option ID: data-option-id="[option id]"');

                options[optionID] = optionElement;
            })(optionElements[i]);

            console.log("Found vote: ", title, options);
        })(voteElements[i]);
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

    var TEMPLATE_URL = "app/social/vote/form/ks-create-vote-form.html";

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
/**
 * Created by ari on 7/2/2015.
 */
(function() {

    // Events

    self.addEventListener('log', onLogEvent);

    function onLogEvent(e) {
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
    setTimeout(onLogEvent, 200);


    // Includes

    function includeScript(scriptPath) {
        var head = document.getElementsByTagName('head')[0];
        if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
            var newScript = document.createElement('script');
            newScript.setAttribute('src', scriptPath);
            head.appendChild(newScript);
        }
    }

    // For PGP Decryption in chat rooms
    //includeScript('pgp/pgp-listeners.js');

    // For Public/Private Key Database access
    //includeScript('pgp/pgp-db.js');
})();

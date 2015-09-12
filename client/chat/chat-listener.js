/**
 * Created by ari on 7/2/2015.
 */
(function() {

    // Events

    self.addEventListener('submit', onFormEvent);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'chat-form':
                if(e.type === 'submit')
                    submitChatForm(e, formElm);
                return true;

            default:
                return false;
        }
    }


    function submitChatForm(e) {
        e.preventDefault();
        var formElm = e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);

        var messageElm = formElm.querySelector('*[name=message], input[type=text], textarea');
        if(!messageElm)
            throw new Error("No message field found");

        var channelElm = formElm.querySelector('*[name=channel]');
        if(!channelElm || !channelElm.value)
            throw new Error("No channel value found");

        if(!messageElm.value)
            return false;
        // if hasn't identified yet, ask to identify now

        var commandString = "CHAT " + channelElm.value + " " + messageElm.value;
        if(messageElm.value[0] === '/') {
            commandString = messageElm.value.substr(1);
            var commandEvent = new CustomEvent('command', {
                detail: commandString,
                cancelable:true,
                bubbles:true
            });
            formElm.dispatchEvent(commandEvent);
            if(commandEvent.defaultPrevented)
                messageElm.value = '';
            return false;
        }

        var socketEvent = new CustomEvent('socket', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(socketEvent);
        if(socketEvent.defaultPrevented)
            messageElm.value = '';
        return false;
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

    // For PGP Decryption in chat rooms
    includeScript('pgp/pgp-listener.js');

    // For Public/Private Key Database access
    includeScript('pgp/pgp-db.js');
})();

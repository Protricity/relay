/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var SCRIPT_PATH = 'cmd/pgp/pgp-form.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }

    window.submitChatForm = function(e) {
        e.preventDefault();
        var formElm = e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);

        var messageElm = formElm.querySelectorAll('*[name=message], input[type=text], textarea');
        if(messageElm.length === 0 || !messageElm[0].value)
            throw new Error("No message field found");

        var channelElm = formElm.querySelectorAll('*[name=channel]');
        if(channelElm.length === 0 || !channelElm[0].value)
            throw new Error("No channel field found");

        var commandString = "MESSAGE " + channelElm[0].value + " " + messageElm[0].value;
        if(messageElm[0].value[0] === '/') {
            commandString = messageElm[0].value.substr(1);
            var commandEvent = new CustomEvent('command', {
                detail: commandString,
                cancelable:true,
                bubbles:true
            });
            formElm.dispatchEvent(commandEvent);
            if(commandEvent.defaultPrevented)
                messageElm[0].value = '';
            return false;
        }

        var socketEvent = new CustomEvent('socket', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(socketEvent);
        if(socketEvent.defaultPrevented)
            messageElm[0].value = '';
        return false;
    };



})();
/**
 * Created by ari on 7/2/2015.
 */



function submitPostForm(e) {
    e.preventDefault();
    var formElm = e.target;
    if(formElm.nodeName.toLowerCase() !== 'form')
        throw new Error("Invalid Form: " + formElm);

    var contentElm = formElm.querySelectorAll('*[name=content], input[type=text], textarea');
    if(contentElm.length === 0 || !contentElm[0].value)
        throw new Error("No content field found");

    var channelElm = formElm.querySelectorAll('*[name=channel]');
    if(channelElm.length === 0 || !channelElm[0].value)
        throw new Error("No channel field found");

    var commandString = "POST " + channelElm[0].value + ' ' + contentElm[0].value;

    // encrypted

    var socketEvent = new CustomEvent('socket', {
        detail: commandString,
        cancelable:true,
        bubbles:true
    });
    formElm.dispatchEvent(socketEvent);
    //if(e.isDefaultPrevented())
    //    messageElm.value = '';
}


(function() {
    var SCRIPT_PATH = 'cmd/pgp/pgp-form.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();
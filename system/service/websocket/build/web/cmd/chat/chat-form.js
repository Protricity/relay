/**
 * Created by ari on 7/2/2015.
 */

function submitChatForm(e) {
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
    if(messageElm[0].value[0] === '/')
        commandString = messageElm[0].value.substr(1);

    var socketEvent = new CustomEvent('socket', {
        detail: commandString,
        cancelable:true
    });
    formElm.dispatchEvent(socketEvent);
    if(socketEvent.isDefaultPrevented())
        messageElm.value = '';
}
/**
 * Created by ari on 6/19/2015.
 */

// Client Script
if(typeof document === 'object') (function() {

    // Events

    document.addEventListener('submit', onFormEvent, false);
     document.addEventListener('change', onFormEvent, false);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'message-form':
                if(e.type === 'submit') {
                    e.preventDefault();
                    submitMessageForm(e, formElm);
                }
                return true;

            default:
                return false;
        }
    }

    function submitMessageForm(e) {
        var formElm = e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);

        var messageElm = formElm.querySelector('*[name=message], input[type=text], textarea');
        if(!messageElm)
            throw new Error("No message field found");

        var userName = formElm.username.value;
        if(!userName)
            throw new Error("Invalid message username");

        if(!messageElm.value)
            return false;
        // if hasn't identified yet, ask to identify now

        var commandString = "MESSAGE " + userName + " " + messageElm.value;
        if(messageElm.value[0] === '/')
            commandString = messageElm.value.substr(1);

        var socketEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(socketEvent);
        if(socketEvent.defaultPrevented)
            messageElm.value = '';

        return false;
    }
})();

// Worker Script
if(typeof module === 'object') (function() {
    var TEMPLATE_URL = 'channel/message/render/message-window.html';

    module.exports.renderMessageWindow = function(username, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        callback(xhr.responseText
            .replace(/{\$username}/gi, username)
        );

        return true;
    };

    module.exports.renderMessage = function(responseString, callback) {
        var match = /^message\s+([^\s]+)\s+(\d+)\s+([\s\S]+)$/im.exec(responseString);
        if(!match)
            throw new Error("Invalid Chat Response: " + responseString);

        var username = match[1];
        var timestamp = parseInt(match[2]);
        var content = match[3];

        var MESSAGE_TEMPLATE =
            '<div class="message-log-entry">' +
                '<span class="username" data-timestamp="{$timestamp}">{$username}</span>' +
                ': <span class="message">{$content}</span>' +
            '</div>';

        callback(MESSAGE_TEMPLATE
            .replace(/{\$timestamp}/gi, timestamp+'')
            .replace(/{\$username}/gi, username)
            .replace(/{\$content}/gi, content),
            username
        );
    };

    module.exports.renderMessageActionEntry = function(responseString, callback) {
        var args = responseString.split(/\s/);
        var messagePath = args[1];
        var username = args[2];

        var actionText = '';
        switch(args[0].toLowerCase()) {
            case 'join': actionText = 'joined'; break;
            case 'leave': actionText = 'left'; break;
            default: throw new Error("Unknown action: " + responseString);
        }

        var ACTION_TEMPLATE =
            '<div class="message-log-entry">' +
                '<span class="username">{$username}</span>' +
                ' has <span class="action">{$action}</span>' +
                ' <a href="#JOIN {$message}" class="path">{$message}</a>' +
            '</div>';

        callback(ACTION_TEMPLATE
            .replace(/{\$action}/gi, actionText)
            .replace(/{\$message}/gi, messagePath)
            .replace(/{\$username}/gi, username)
        );
    };

    module.exports.renderMessageNickChange = function (commandResponse, callback) {
        var args = commandResponse.split(/\s/);
        var old_username = args[1];
        var new_username = args[2];

        var NICK_TEMPLATE =
            '<div class="message-log-entry">' +
                'Username <span class="username">{$old_username}</span>' +
                ' has been <span class="action">renamed</span> to <span class="username">{$new_username}</span>' +
            '</div>';

        callback(NICK_TEMPLATE
            .replace(/{\$old_username}/gi, old_username)
            .replace(/{\$new_username}/gi, new_username)
        );
    };

})();
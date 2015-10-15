/**
 * Created by ari on 6/19/2015.
 */

// Client Script
if(typeof document === 'object')
(function() {

    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('input', onFormEvent);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'chat-form':
                if(e.type === 'submit')
                    submitChatForm(e, formElm);

                var maximizedChannels = document.getElementsByClassName('maximized channel');
                while(maximizedChannels.length > 0)
                    maximizedChannels[0].classList.remove('maximized');
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
else
    (function() {
        var TEMPLATE_URL = 'app/social/chat/render/chat-window.html';

        module.exports.renderChatWindow = function(channelPath, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", TEMPLATE_URL);
            xhr.onload = function () {
                callback(xhr.responseText
                    .replace(/{\$channel}/gi, channelPath)
                    .replace(/{\$channel_lowercase}/gi, channelPath.toLowerCase())
                );
            };
            xhr.send();

            return true;
        };

        module.exports.renderChatMessage = function(responseString, callback) {
            var match = /^(chat)\s+(\S+)\s+(\S+)\s+(\d+)\s+([\s\S]+)$/im.exec(responseString);
            if (!match)
                throw new Error("Invalid Chat Response: " + responseString);
            var channelPath = match[2];
            var username = match[3];
            var timestamp = parseInt(match[4]);
            var content = (match[5]); // fixPGPMessage

            var MESSAGE_TEMPLATE =
                '<div class="chat-log-entry">' +
                    '<span class="username" data-timestamp="{$timestamp}">{$username}</span>' +
                    ': <span class="message">{$content}</span>' +
                '</div>';

            callback(MESSAGE_TEMPLATE
                .replace(/{\$timestamp}/gi, timestamp+'')
                .replace(/{\$channel}/gi, channelPath)
                .replace(/{\$username}/gi, username)
                .replace(/{\$content}/gi, content),
                username
            );
        };

        module.exports.renderChatActionEntry = function(responseString, callback) {
            var args = responseString.split(/\s/);
            var channelPath = args[1];
            var username = args[2];

            var actionText = '';
            switch(args[0].toLowerCase()) {
                case 'join': actionText = 'joined'; break;
                case 'leave': actionText = 'left'; break;
                default: throw new Error("Unknown action: " + responseString);
            }

            var ACTION_TEMPLATE =
                '<div class="chat-log-entry">' +
                    '<span class="username">{$username}</span>' +
                    ' has <span class="action">{$action}</span>' +
                    ' <a href="#JOIN {$channel}" class="path">{$channel}</a>' +
                '</div>';

            callback(ACTION_TEMPLATE
                .replace(/{\$action}/gi, actionText)
                .replace(/{\$channel}/gi, channelPath)
                .replace(/{\$username}/gi, username)
            );
        };

        module.exports.renderChatNickChange = function (commandResponse, callback) {
            var args = commandResponse.split(/\s/);
            var old_username = args[1];
            var new_username = args[2];

            var NICK_TEMPLATE =
                '<div class="chat-log-entry">' +
                    'Username <span class="username">{$old_username}</span>' +
                    ' has been <span class="action">renamed</span> to <span class="username">{$new_username}</span>' +
                '</div>';

            callback(NICK_TEMPLATE
                .replace(/{\$old_username}/gi, old_username)
                .replace(/{\$new_username}/gi, new_username)
            );
        };


        module.exports.renderChatUserList = function(channelPath, userList, callback) {
            var optionHTML = "<optgroup class='chat-active-users:" + channelPath.toLowerCase() + "' label='Active Users (" + userList.length + ")'>\n";

            for (var i = 0; i < userList.length; i++) {
                var username = userList[i];
                optionHTML += "\n\t<option>" + username + "</option>"
            }
            optionHTML += "\n</optgroup>";
            callback(optionHTML);
        };

    })();

if (!module) var module = {};
if (!module.exports) module.exports = {};
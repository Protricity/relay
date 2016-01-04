/**
 * Created by ari on 6/19/2015.
 */

// Client Script
if(typeof document === 'object') (function() {

    // Events

    document.addEventListener('submit', onFormEvent, false);
    document.addEventListener('keydown', onFormEvent, false);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'ks-message-form':
                if(e.type === 'submit') {
                    e.preventDefault();
                    submitMessageForm(e, formElm);
                }
                if(e.type.substr(0, 3) === 'key') {
                    handleMessageFormKeyEvent(e, formElm);
                }
                return true;

            default:
                return false;
        }
    }

    var history = [];
    var historyPos = 0;
    function handleMessageFormKeyEvent(e, formElm) {
        var messageElm = formElm.querySelector('*[name=message], input[type=text], textarea');
        switch(e.which) {
            case 13: // ENTER
                if(e.ctrlKey) {
                    e.preventDefault();
                    submitMessageForm(e, formElm);
                }
                break;

            case 38: // UP
                messageElm.value = nextHistory(-1);
                break;

            case 40: // Down
                messageElm.value = nextHistory(1);
                break;
        }

        function nextHistory(inc) {
            historyPos += inc;
            if(historyPos > history.length-1)
                historyPos = 0;
            else if (historyPos < 0)
                historyPos = history.length-1;
            return history[historyPos];
        }
    }

    function submitMessageForm(e, formElm) {
        formElm = formElm || e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);

        var messageElm = formElm.querySelector('*[name=message], input[type=text], textarea');
        if(!messageElm)
            throw new Error("No message field found");

        var pgp_id_to = formElm.pgp_id_to.value;
        if(!pgp_id_to)
            throw new Error("Invalid pgp_id_to");
        var pgp_id_from = formElm.pgp_id_from.value;
        if(!pgp_id_from)
            throw new Error("Invalid pgp_id_from");

        if(!messageElm.value)
            return false;
        // if hasn't identified yet, ask to identify now

        var messageContent = messageElm.value;
        var command = 'MESSAGE';

        if(formElm.message_encryption_options.value === 'encrypt')
            command = 'MESSAGE.ENCRYPT';


        var commandString = command + " " + pgp_id_to + " " + pgp_id_from + " " + messageContent;
        if(messageElm.value[0] === '/')
            commandString = messageElm.value.substr(1);

        var socketEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(socketEvent);
        if(socketEvent.defaultPrevented) {
            history.push(messageElm.value);
            messageElm.value = '';
        }

        return false;
    }
})();

// Worker Script
if(typeof module === 'object') (function() {
    var TEMPLATE_URL = 'keyspace/message/render/ks-message-window.html';

    module.exports.renderMessageWindow = function(pgp_id_to, pgp_id_from, switchOnResponse, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        var uid = pgp_id_to + ':' + pgp_id_from;
        if(switchOnResponse) {
            var pgp_id_from_old = pgp_id_from;
            pgp_id_from = pgp_id_to;
            pgp_id_to = pgp_id_from_old;
            uid = pgp_id_to + ':' + pgp_id_from;
        }

        var user_id_from = pgp_id_from;
        var user_id_to = pgp_id_to;

        var requestURL = 'http://' + pgp_id_from + '.ks/public/id';
        KeySpaceDB.queryOne(requestURL, function(err, contentEntry) {
            if (contentEntry)
                user_id_from = contentEntry.user_id;

            var requestURL = 'http://' + pgp_id_to + '.ks/public/id';
            KeySpaceDB.queryOne(requestURL, function (err, contentEntry) {
                if (contentEntry)
                    user_id_to = contentEntry.user_id;

                callback(xhr.responseText
                        .replace(/{\$uid}/gi, uid)
                        .replace(/{\$pgp_id_to}/gi, pgp_id_to)
                        .replace(/{\$pgp_id_from}/gi, pgp_id_from)
                        .replace(/{\$to}/gi, user_id_to)
                        .replace(/{\$from}/gi, user_id_from)
                );
            });

        });

        return true;
    };

    module.exports.renderMessage = function(responseString, switchOnResponse, callback) {
        var match = /^(?:keyspace\.)?message\s+([a-f0-9]{8,})\s+([a-f0-9]{8,})\s*([\s\S]*)$/im.exec(responseString);
        if (!match)
            throw new Error("Invalid Message Response: " + responseString);

        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        var pgp_id_to = match[1].toUpperCase();
        var pgp_id_from = match[2].toUpperCase();
        var content = match[3];

        // TODO: fix logic
        var uid = pgp_id_to + ':' + pgp_id_from;
        if(switchOnResponse) {
            uid = pgp_id_from + ':' + pgp_id_to;
            //var pgp_id_from_old = pgp_id_from;
            //pgp_id_from = pgp_id_to;
            //pgp_id_to = pgp_id_from_old;
        }

        var user_id_from = pgp_id_from;

        var requestURL = 'http://' + pgp_id_from + '.ks/public/id';
        KeySpaceDB.queryOne(requestURL, function(err, contentEntry) {
            if(contentEntry)
                user_id_from = contentEntry.user_id;

            var MESSAGE_TEMPLATE =
                '<div class="ks-message-log:{$uid} append-children-on-render">' +
                    '<div class="message-log-entry">' +
                        '<span class="username" data-id="{$pgp_id_from}">{$from}</span>' +
                        ': <span class="message">{$content}</span>' +
                    '</div>' +
                '</div>';

            callback(MESSAGE_TEMPLATE
                    .replace(/{\$uid}/gi, uid)
                    .replace(/{\$pgp_id_to}/gi, pgp_id_to)
                    .replace(/{\$pgp_id_from}/gi, pgp_id_from)
                    //.replace(/{\$to}/gi, user_id_to)
                    .replace(/{\$from}/gi, user_id_from)
                    .replace(/{\$content}/gi, content)
            );
        });
    };

})();
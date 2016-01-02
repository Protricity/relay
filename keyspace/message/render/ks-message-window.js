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
            case 'ks-message-form':
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

        var pgp_id_to = formElm.pgp_id_to.value;
        if(!pgp_id_to)
            throw new Error("Invalid pgp_id_to");
        var pgp_id_from = formElm.pgp_id_from.value;
        if(!pgp_id_from)
            throw new Error("Invalid pgp_id_from");

        if(!messageElm.value)
            return false;
        // if hasn't identified yet, ask to identify now

        var commandString = "MESSAGE " + pgp_id_to + " " + pgp_id_from + " " + messageElm.value;
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
    var TEMPLATE_URL = 'keyspace/message/render/ks-message-window.html';

    module.exports.renderMessageWindow = function(pgp_id_to, pgp_id_from, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

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
                        .replace(/{\$pgp_id_to}/gi, pgp_id_to)
                        .replace(/{\$pgp_id_from}/gi, pgp_id_from)
                        .replace(/{\$to}/gi, user_id_to)
                        .replace(/{\$from}/gi, user_id_from)
                );
            });

        });

        return true;
    };

    module.exports.renderMessage = function(responseString, callback) {
        var match = /^(?:keyspace\.)?message\s+([a-f0-9]{8,})\s+([a-f0-9]{8,})\s*([\s\S]*)$/im.exec(responseString);
        if (!match)
            throw new Error("Invalid Message Response: " + responseString);

        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        var pgp_id_to = match[1].toUpperCase();
        var pgp_id_from = match[2].toUpperCase();
        var content = match[3];

        var user_id_from = pgp_id_from;

        var requestURL = 'http://' + pgp_id_from + '.ks/public/id';
        KeySpaceDB.queryOne(requestURL, function(err, contentEntry) {
            if(contentEntry)
                user_id_from = contentEntry.user_id;

            var MESSAGE_TEMPLATE =
                '<div class="ks-message-log:{$pgp_id_to}:{$pgp_id_from} append-children-on-render">' +
                    '<div class="message-log-entry">' +
                        '<span class="username" data-id="{$pgp_id_from}">{$from}</span>' +
                        ': <span class="message">{$content}</span>' +
                    '</div>' +
                '</div>';

            callback(MESSAGE_TEMPLATE
                    .replace(/{\$pgp_id_to}/gi, pgp_id_to)
                    .replace(/{\$pgp_id_from}/gi, pgp_id_from)
                    //.replace(/{\$to}/gi, user_id_to)
                    .replace(/{\$from}/gi, user_id_from)
                    .replace(/{\$content}/gi, content)
            );
        });
    };

})();
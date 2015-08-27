/**
 * Created by ari on 7/2/2015.
 */
(function() {

//    var unidentifiedSessionUserElms = document.getElementsByClassName('unidentified-session-uid');
    document.addEventListener('log', function(e) {
        var htmlContainer = e.target;
        // If this is a chat container, scroll to the bottom
        var channelContent = htmlContainer.querySelector('form[name=chat-form] .channel-content');
        if (channelContent)
            channelContent.scrollTop = channelContent.scrollHeight;

    });
//
//        if(unidentifiedSessionUserElms.length > 0) {
//            self.PGPDB(function(db, PGPDB) {
//                var transaction = db.transaction([PGPDB.DB_TABLE_SESSIONS], "readonly");
//                var sessionDBStore = transaction.objectStore(PGPDB.DB_TABLE_SESSIONS);
//
//                for(var i=0; i<unidentifiedSessionUserElms.length; i++) (function(unidentifiedSessionUserElm) {
//                    unidentifiedSessionUserElm.classList.remove('unidentified-session-uid');
//                    unidentifiedSessionUserElm.classList.add('unknown-session-uid');
//                    var session_uid = unidentifiedSessionUserElm.innerHTML;
//
//                    var req = sessionDBStore.get(session_uid);
//                    req.onsuccess = function (evt) {
//                        var sessionData = evt.target.result;
//                        if(!sessionData)
//                            throw new Error("Session IDSIG not found: " + session_uid);
//
//                        unidentifiedSessionUserElm.classList.remove('unknown-session-uid');
//                        unidentifiedSessionUserElm.classList.add('found-session-uid');
//
//                        var newUsernameElm = document.createElement('span');
//                        newUsernameElm.classList.add('session-username');
//                        newUsernameElm.innerHTML = sessionData.username;
//                        unidentifiedSessionUserElm.parentNode.insertBefore(newUsernameElm, unidentifiedSessionUserElm);
//
////                        search for others since it was succesful?
//                    };
//                    req.onerror = function(err) {
//                        callback(err, null);
//                    }
//
//                }) (unidentifiedSessionUserElms[i]);
//
//            })
//        }
//    });


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

        // if hasn't identified yet, ask to identify now

        var commandString = "CHAT " + channelElm[0].value + " " + messageElm[0].value;
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

// For PGP Decryption in chat rooms
(function() {
    var SCRIPT_PATH = 'cmd/pgp/pgp-listener.js';
    var head = document.getElementsByTagName('head')[0];
    if (head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();


// For Public/Private Key Database access

(function() {
    var SCRIPT_PATH = 'cmd/pgp/pgp-db.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);
    }
})();

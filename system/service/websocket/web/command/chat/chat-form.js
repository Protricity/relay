/**
 * Created by ari on 7/2/2015.
 */
(function() {

//    var unidentifiedSessionUserElms = document.getElementsByClassName('unidentified-session-uid');
//    document.addEventListener('log', function(e) {
//        var htmlContainer = e.target;
//        // If this is a chat container, scroll to the bottom
//        var channelContent = htmlContainer.querySelector('form[name=chat-form] .channel-content');
//        if (channelContent)
//            channelContent.scrollTop = channelContent.scrollHeight;
//    });
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
    };

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
    includeScript('command/pgp/pgp-listener.js');

    // For Public/Private Key Database access
    includeScript('command/pgp/pgp-db.js');


})();

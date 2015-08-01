/**
 * Created by ari on 6/19/2015.
 */

(function() {

    var CLASS_FORM_SOCKET_COMMAND = 'form-socket-command';

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';
    var CLASS_CHANNEL_CONTAINER = 'channel-container';
    var CLASS_CHANNEL_LIST = 'channel-list';
    var CLASS_CHANNEL_LIST_ENTRY = 'channel-list-entry';

    var socketWorker = new Worker('js/socket-worker.js');
    socketWorker.addEventListener('message', function(e) {
        receiveMessage(e.data || e.detail);
    }, true);

    document.addEventListener('socket', function(e) {
        var commandString = e.detail || e.data;
        socketWorker.postMessage(commandString);
        e.preventDefault();
    });
    document.addEventListener('message', function(e) {
        receiveMessage(e.data || e.detail);
    });

    document.addEventListener('command', function(e) {
        var commandString = e.detail || e.data;
        socketWorker.postMessage(commandString);
        e.preventDefault();
    });

    window.addEventListener('hashchange', onHashChange);

    function receiveMessage(message) {
        var args = /^(\w+)\s+([\s\S]*)$/mi.exec(message);
        var commandString = args[1].toLowerCase();
        switch(commandString) {
            case 'log':
            case 'replacelog':
            case 'rlog':
                args = /^([^\s]+)\s+([\s\S]*)$/mi.exec(args[2]);
                var channelPath = args[1];
                logToChannel(channelPath, args[2], commandString[0] === 'r', commandString[0] === 'r');
                break;

            default:
                console.error("Unhandled command: " + message);
                break;

            case 'socket':
                console.info('SOCKET ' + message);
                break;

            case 'error':
            case 'warn':
            case 'info':
            case 'assert':
                console[commandString](message);
                break;
        }
    }

    function logToChannel(channelPath, content, replace, focus) {
        content = content
            .replace(/{\$channel}/gi, channelPath);

        var match;
        while(match = /<script([^>]*)><\/script>/gi.exec(content)) {
            var scriptContent = match[0];
            content = content.replace(scriptContent, '');
            var match2 = /\s*src=['"]([^'"]*)['"]/gi.exec(match[1]);
            if(match2) {
                var hrefValue = match2[1];
                if(document.querySelectorAll('script[src=' + hrefValue.replace(/[/.:~]/g, '\\$&') + ']').length === 0) {
                    var newScript = document.createElement('script');
                    newScript.setAttribute('src', hrefValue);
                    document.getElementsByTagName('head')[0].appendChild(newScript);
                }
            } else {
                console.error("Invalid Script: " + scriptContent);
            }
        }

        var channelContainers = document.getElementsByClassName(CLASS_CHANNEL_CONTAINER);
        for(var i=0; i<channelContainers.length; i++) {
            var channelContainer = channelContainers[i];
            var channelOutputs = channelContainer.getElementsByClassName(channelPath);
            if(channelOutputs.length === 0) {
                var newChannel = document.createElement('fieldset');
                newChannel.setAttribute('class', CLASS_CHANNEL + ' ' + channelPath);
                newChannel.setAttribute('data-channel', channelPath);
                //newChannel.setAttribute('draggable', 'true');

//                 if(channelContainer.firstChild)
//                    channelContainer.insertBefore(newChannel, channelContainer.firstChild);
//                 else
                    channelContainer.appendChild(newChannel);
            }

            var channelOutput = channelOutputs[0];
            var contentTarget = channelOutput.getElementsByClassName(CLASS_CHANNEL_CONTENT);

            if(replace) {
                var oldContent = null;
                if(contentTarget.length > 0) {
                    oldContent = contentTarget[0];
                    oldContent.parentNode.removeChild(oldContent);
                }
                channelOutput.innerHTML = content;

                if(contentTarget.length > 0 && oldContent !== contentTarget[0]) {
                    var newTarget = contentTarget[0];
                    console.info("Preserving content: ", oldContent, newTarget);
                    newTarget.parentNode.insertBefore(oldContent, newTarget);
                    newTarget.parentNode.removeChild(newTarget);
                }

            } else {

                if(contentTarget.length > 0) {
                    contentTarget[0].innerHTML += content;
                    contentTarget[0].scrollTop = contentTarget[0].scrollHeight;

                } else {
                    channelOutput.innerHTML += content;
                    channelOutput.scrollTop = channelOutput.scrollHeight;
                }
            }

            if(focus) {
                var channelInput = channelContainer.querySelector('textarea, input');
                if(channelInput)
                    channelInput.focus();
            }

            var contentEvent = new CustomEvent('log', {
                bubbles: true,
                detail: content
            });
            channelOutput.dispatchEvent(contentEvent);

        }

    }


    //function refreshChannels() {
    //    var channelLists = document.getElementsByClassName(CLASS_CHANNEL_LIST);
    //    var channelElements = document.getElementsByClassName(CLASS_CHANNEL);
    //    var j, path, selectContent='';
    //    for(var i=0; i<channelLists.length; i++) {
    //        var channelList = channelLists[i];
    //        switch(channelList.nodeName.toLowerCase()) {
    //            case 'select':
    //                for(j=0; j<channelElements.length; j++) {
    //                    path = channelElements[j].getAttribute('data-channel');
    //                    selectContent += '<option><a href="#JOIN ' + path + '">' + path + '</a></option>';
    //                }
    //                channelList.innerHTML = selectContent;
    //                break;
    //
    //            case 'ul':
    //                for(j=0; j<channelElements.length; j++) {
    //                    path = channelElements[j].getAttribute('data-channel');
    //                    selectContent += '<li><a href="#JOIN ' + path + '">' + path + '</a></li>';
    //                }
    //                channelList.innerHTML = selectContent;
    //                break;
    //
    //            default:
    //                break;
    //        }
    //    }
    //}


    function onHashChange(e) {
        var hashCommand = document.location.hash.replace(/^#/, '');
        if(!hashCommand)
            return false;

        var commandEvent = new CustomEvent('command', {
            detail: hashCommand,
            cancelable:true,
            bubbles:true
        });
        document.dispatchEvent(commandEvent);
        if(!commandEvent.defaultPrevented)
            socketWorker.postMessage(hashCommand);

        document.location.hash = '';
//         document.location.href = document.location.origin + document.location.pathname;
    }
})();

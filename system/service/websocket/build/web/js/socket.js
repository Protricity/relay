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
        receiveMessage(e.data);
    }, true);

    document.addEventListener('socket', onSocketEvent);

    function receiveMessage(message) {
        var args = message.split(/\s+/);
        var command = args[0].toLowerCase();
        switch(command) {
            case 'log':
            case 'replacelog':
            case 'rlog':
                args.shift();
                var channelPath = (args.shift());
                logToChannel(channelPath, args.join(' '), command[0] === 'r', command[0] === 'r');
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
                console[command](message);
                break;
        }
    }

    function logToChannel(channelPath, content, replace, focus) {
        content = content
            .replace(/{\$channel}/gi, channelPath);

        var match = /<script([^>]*)>(.*)<\/script>/gi.exec(content);
        if(match) {
            var scriptContent = match[0];
            content = content.replace(scriptContent, '');
            var match2 = /\s*src=['"]([^'"]*)['"]/gi.exec(match[1]);
            if(match2) {
                var hrefValue = match2[1];
                if(document.querySelectorAll('script[href=' + escapeCSS(hrefValue) + ']').length === 0) {
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
                newChannel.setAttribute('draggable', 'true');

                if(channelContainer.firstChild)
                   channelContainer.insertBefore(newChannel, channelContainer.firstChild);
                else
                    channelContainer.appendChild(newChannel);
            }
            var contentTarget = channelOutputs[0].getElementsByClassName(CLASS_CHANNEL_CONTENT);

            if(replace) {
                var oldContent = null;
                if(contentTarget.length > 0) {
                    oldContent = contentTarget[0];
                    oldContent.parentNode.removeChild(oldContent);
                }
                channelOutputs[0].innerHTML = content;

                if(contentTarget.length > 0 && oldContent !== contentTarget[0]) {
                    var newTarget = contentTarget[0];
                    console.info("Preserving content: ", oldContent, newTarget);
                    newTarget.parentNode.insertBefore(oldContent, newTarget);
                    newTarget.parentNode.removeChild(newTarget);
                }

            } else {

                if(contentTarget.length > 0) {
                    contentTarget[0].innerHTML += content;
                } else {
                    channelOutputs[0].innerHTML += content;
                }
                contentTarget[0].scrollTop = contentTarget[0].scrollHeight;
            }

            if(focus) {
                var channelInput = channelContainer.querySelectorAll(escapeCSS('.' + channelPath) + ' .focus');
                if(channelInput.length > 0)
                    channelInput[0].focus();
            }
        }

    }

    function onSocketEvent(e) {
        var commandString = e.detail || e.data;
        socketWorker.postMessage(commandString);
        e.preventDefault();
    }

    function escapeCSS(name) {
        return name
            .replace(/[!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '\\$&');
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


})();

/**
 * Created by ari on 6/19/2015.
 */

(function() {

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';
    var CLASS_CHANNEL_CONTAINER = 'channel-container';
    var CLASS_CHANNEL_LIST = 'channel-list';
    var CLASS_CHANNEL_LIST_ENTRY = 'channel-list-entry';


    var CHANNEL_CONTENT_DEFAULT =
        "<legend>Channel: {$channel}</legend>" +
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
        "<input class='focus reset' data-channel='{$channel}' placeholder='Send a message to {$channel}. [hit enter]' />";

    var socketWorker = new Worker('js/socket-worker.js');
    socketWorker.addEventListener('message', function(e) { receiveMessage(e.data); }, true);

    if(typeof window.socket === 'undefined')
        window.socket = socketWorker;

    document.addEventListener('submit', onSubmitEvent);
//     document.addEventListener('keydown', onInputEvent);

    document.addEventListener('click', onMouseEvent);
    document.addEventListener('mousemove', onMouseEvent);
    document.addEventListener('mousedown', onMouseEvent);
    document.addEventListener('dragstart', onMouseEvent);
    document.addEventListener('dragover', onMouseEvent);
    document.addEventListener('drop', onMouseEvent);

    window.addEventListener('hashchange', onHashChange);

    function receiveMessage(message) {
        var args = message.split(/\s+/);
        var command = args[0].toLowerCase();
        switch(command) {
            case 'log':
            case 'replacelog':
            case 'rlog':
                args.shift();
                var channelPath = fixChannelPath(args.shift());
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


    function refreshChannels() {
        var channelLists = document.getElementsByClassName(CLASS_CHANNEL_LIST);
        var channelElements = document.getElementsByClassName(CLASS_CHANNEL);
        var j, path, selectContent='';
        for(var i=0; i<channelLists.length; i++) {
            var channelList = channelLists[i];
            switch(channelList.nodeName.toLowerCase()) {
                case 'select':
                    for(j=0; j<channelElements.length; j++) {
                        path = channelElements[j].getAttribute('data-channel');
                        selectContent += '<option><a href="#JOIN ' + path + '">' + path + '</a></option>';
                    }
                    channelList.innerHTML = selectContent;
                    break;

                case 'ul':
                    for(j=0; j<channelElements.length; j++) {
                        path = channelElements[j].getAttribute('data-channel');
                        selectContent += '<li><a href="#JOIN ' + path + '">' + path + '</a></li>';
                    }
                    channelList.innerHTML = selectContent;
                    break;

                default:
                    break;
            }
        }
    }

    function logToChannel(channelPath, content, replace, focus) {
        content = content
            .replace(/{\$channel}/gi, channelPath);
        var channelContainers = document.getElementsByClassName(CLASS_CHANNEL_CONTAINER);
        for(var i=0; i<channelContainers.length; i++) {
            var channelContainer = channelContainers[i];
            var channelOutputs = channelContainer.getElementsByClassName(channelPath);
            if(channelOutputs.length === 0) {
                var newChannel = document.createElement('fieldset');
                newChannel.setAttribute('class', CLASS_CHANNEL + ' ' + channelPath);
                newChannel.setAttribute('data-channel', channelPath);
                newChannel.setAttribute('draggable', 'true');

                //newChannel.innerHTML = CHANNEL_CONTENT_DEFAULT
                //    .replace(/{\$channel}/gi, path);

                if(channelContainer.firstChild)
                   channelContainer.insertBefore(newChannel, channelContainer.firstChild);
                else
                    channelContainer.appendChild(newChannel);

                focus = true;

                refreshChannels();
            }
            var contentTarget = channelOutputs[0].getElementsByClassName(CLASS_CHANNEL_CONTENT);
            if(contentTarget.length === 0)
                contentTarget = channelOutputs;

            if(replace) {
                contentTarget[0].innerHTML = content;

            } else {
                contentTarget[0].innerHTML += content;
                contentTarget[0].scrollTop = contentTarget[0].scrollHeight;

            }

            if(focus) {
                var channelInput = channelContainer.querySelectorAll(escapeCSS('.' + channelPath) + ' .focus');
                if(channelInput.length > 0)
                    channelInput[0].focus();
            }
        }

    }

    function onSubmitEvent(e) {
        if(e.target.nodeName.toLowerCase() !== 'form')
            return;
        var formElm = e.target;
        var action = formElm.getAttribute('action');
        if(action.length === 0 || action[0] !== '#')
            return;

        var commandString = action.substr(1);
//         if(commandString[0] === '/') { 
//             commandString = commandString.substr(1);
//         } else {
//             commandString = action.substr(1) + ' ' + commandString;
//         }
        
        var inputs = formElm.querySelectorAll('*[name]');
        for(var ii=0; ii<inputs.length; ii++) 
            commandString = commandString
                .replace('$' + inputs[ii].getAttribute('name'), inputs[ii].value);

        if(!commandString) {
            console.warn('No command content received');
            return;
        }

        e.preventDefault();
        socketWorker.postMessage(commandString);

        inputs = formElm.getElementsByClassName('reset');
        for(ii=0; ii<inputs.length; ii++)
            inputs[ii].value = '';
    }

    var lastDragElement = null;
    function onMouseEvent(e) {
        switch(e.type) {
            case 'dragstart':
                if(e.target.classList.contains(CLASS_CHANNEL)) {
                    lastDragElement = e.target;
                    e.dataTransfer.dropEffect = 'move';
                    return;
                }
                break;

            case 'dragover':
                if(e.target.classList.contains(CLASS_CHANNEL_CONTAINER)) {
                    e.preventDefault();
                    return;
                }
                break;

            case 'drop':
                if(lastDragElement && e.target.classList.contains(CLASS_CHANNEL_CONTAINER)) {
                    e.preventDefault();
                    e.target.appendChild(lastDragElement);
                    refreshChannels();
                    return;
                }
                break;

            default:
                break;
        }
    }

    function onHashChange(e) {
        var hashCommand = document.location.hash.replace(/^#/, '');
        if(!hashCommand)
            return false;
        socketWorker.postMessage(hashCommand);
        document.location.hash = '';
//         document.location.href = document.location.origin + document.location.pathname;
    }

    function escapeCSS(name) {
        return name
            .replace(/[!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '\\$&');
    }

    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

})();
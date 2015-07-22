/**
 * Created by ari on 6/19/2015.
 */

(function() {

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';
    var CLASS_CHANNEL_CONTAINER = 'channel-container';
    var CLASS_CHANNEL_LIST = 'channel-list';
    var CLASS_CHANNEL_LIST_ENTRY = 'channel-list-entry';

    var CLASS_INPUT_POST = 'input-post';

    var CHANNEL_CONTENT_DEFAULT =
        "<legend>Channel: {$channel}</legend>" +
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
        "<input class='" + CLASS_INPUT_POST + "' data-channel='{$channel}' placeholder='Send a message to {$channel}. [hit enter]' />";

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
        var user, channelPath;
        var args = message.split(/\s+/);
        var command = args[0].toLowerCase();
        switch(command) {
            case 'log':
            case 'replacelog':
            case 'rlog':
                args.shift();
                channelPath = fixChannelPath(args.shift());
                logToChannel(channelPath, args.join(' '), command[0] === 'r', command[0] === 'r');
                break;

            case 'leave':
            case 'join':
            case 'msg':
            case 'message':
                args.shift();
                user = args.shift();
                channelPath = fixChannelPath(args.shift());
                //joinChannel(jPath);
                logToChannel(channelPath, '<div class="channel-log">');
                logToChannel(channelPath, '<span class="user">' + user + '</span>');

                switch(command) {
                    case 'leave':
                        logToChannel(channelPath, ' has <span class="action">left</span> <a href="#JOIN ' + channelPath + '" class="path">' + channelPath + '</a>');
                        break;
                    case 'join':
                        logToChannel(channelPath, ' has <span class="action">joined</span> <a href="#JOIN ' + channelPath + '" class="path">' + channelPath + '</a>');
                        break;
                    case 'msg':
                    case 'message':
                        var chContent = args.join(' ');
                        logToChannel(channelPath, ': <span class="message">' + chContent + '</span>');
                        break;
                    default:
                }
                logToChannel(channelPath, '</div>');

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

    function logToChannel(path, content, replace, focus) {
        content = content
            .replace(/{\$channel}/gi, path);
        var channelContainers = document.getElementsByClassName(CLASS_CHANNEL_CONTAINER);
        for(var i=0; i<channelContainers.length; i++) {
            var channelContainer = channelContainers[i];
            var channelOutputs = channelContainer.getElementsByClassName('channel:' + path);
            if(channelOutputs.length === 0) {
                var newChannel = document.createElement('fieldset');
                newChannel.setAttribute('class', CLASS_CHANNEL + ' channel:' + path);
                newChannel.setAttribute('data-channel', path);
                newChannel.setAttribute('draggable', 'true');

                //newChannel.innerHTML = CHANNEL_CONTENT_DEFAULT
                //    .replace(/{\$channel}/gi, path);

                if(channelContainer.firstChild)
                   channelContainer.insertBefore(newChannel, channelContainer.firstChild);
                else
                    channelContainer.appendChild(newChannel);

                var channelInput = channelContainer.querySelectorAll(escapeCSS('.channel:' + path) + ' .' + CLASS_INPUT_POST);
                if(channelInput.length > 0)
                    channelInput[0].focus();

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
                var channelInput = channelContainer.querySelectorAll(escapeCSS('.channel:' + path) + ' .' + CLASS_INPUT_POST);
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

        var commandString = '';
        var inputs = formElm.querySelectorAll('input[type=text], textarea, select');
        for(var ii=0; ii<inputs.length; ii++) 
            commandString += (commandString ? ' ' : '') + (inputs[ii].value || '_');


        if(!commandString) {
            console.warn('No command content received');
            return;
        }

        if(commandString[0] === '/') { 
            commandString = commandString.substr(1);
        } else {
            commandString = action.substr(1) + ' ' + commandString;
        }

        e.preventDefault();
        for(var ii=0; ii<inputs.length; ii++) 
            inputs[ii].value = '';
        socketWorker.postMessage(commandString);
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

            //case 'click':
            //    if(e.target.nodeName.toLowerCase() === 'a') {
            //        var path = e.target.getAttribute('href');
            //
            //        // Focus on channel
            //        var channelInput = document.querySelectorAll(escapeCSS('.channel:' + path) + ' .' + CLASS_INPUT_POST);
            //        if(channelInput.length > 0)
            //            channelInput[0].focus();
            //        else
            //            socketWorker.postMessage("JOIN " + path);
            //
            //        e.preventDefault();
            //        return;
            //    }
            //    break;

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
            .replace('/', '\\/')
            .replace(':', '\\:')
            .replace('#', '\\#');
    }

    function fixChannelPath(path) {
        if(!/#?[./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        if(path.indexOf("/") === -1 && path.indexOf(".") === -1 && path.charAt(0) != '#')
            path = '#' + path;
        return path;
    }

})();
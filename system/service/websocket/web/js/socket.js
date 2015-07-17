/**
 * Created by ari on 6/19/2015.
 */

(function() {

    var CLASS_CHANNEL = 'socket-channel';
    var CLASS_CHANNEL_CONTENT = 'socket-channel-content';
    var CLASS_CHANNEL_CONTAINER = 'socket-channel-container';
    var CLASS_CHANNEL_LIST = 'socket-channel-list';
    var CLASS_CHANNEL_LIST_ENTRY = 'socket-channel-list-entry';

    var CLASS_INPUT_POST = 'socket-input-post';

    var CHANNEL_CONTENT_DEFAULT =
        "<fieldset class='" + CLASS_CHANNEL_CONTENT + "'>Joining {$channel}...</fieldset>" +
        "<input class='" + CLASS_INPUT_POST + "' data-channel='{$channel}' placeholder='Send a message to {$channel}' />";

    var socketWorker = new Worker('js/socket-worker.js');
    socketWorker.addEventListener('message', function(e) { receiveMessage(e.data); }, true);

    if(typeof window.socket === 'undefined')
        window.socket = socketWorker;

    document.addEventListener('submit', onInputEvent);
    document.addEventListener('keydown', onInputEvent);

    var activeChannels = [];


    function receiveMessage(message) {

        var args = message.split(/\s+/);
        var command = args[0].toLowerCase();
        switch(command) {
            case 'leave':
            case 'join':
            case 'msg':
            case 'message':
                args.shift();
                var chUser = args.shift();
                var chPath = args.shift();
                //joinChannel(jPath);
                logToChannel(chPath, '<div class="channel-log">');
                logToChannel(chPath, '<span class="user">' + chUser + '</span>');

                switch(command) {
                    case 'leave':
                        logToChannel(chPath, ' has <span class="action">left</span> <span class="path">' + chPath + '</span>');
                        break;
                    case 'join':
                        logToChannel(chPath, ' has <span class="action">joined</span> <span class="path">' + chPath + '</span>');
                        break;
                    case 'msg':
                    case 'message':
                        var chContent = args.join(' ');
                        logToChannel(chPath, ': <span class="message">' + chContent + '</span>');
                        break;
                    default:
                }
                logToChannel(chPath, '</div>');

                break;

            default:
                console.error("Unhandled command: " + message);
                break;

            case 'error':
            case 'warn':
            case 'info':
            case 'assert':
            case 'log':
                console[command](message);
                break;
        }
    }

    function onInputEvent(e) {
        var input = e.target;
        if(!input.classList.contains(CLASS_INPUT_POST))
            return;


        switch(e.type) {
            case 'keydown':
                if(e.keyCode != 13)
                    return;
                break;

            default:
                throw new Error("Unknown event: " + e.type);
        }

        var commandString = input.value;
        if(!commandString) {
            console.warn('No command content received');
            return;
        }

        var path = input.getAttribute('data-channel');
        if(commandString[0] === '/')
            commandString = commandString.substr(1);
        else if (path)
            commandString = "MESSAGE " + path + " " + commandString;

        socketWorker.postMessage(commandString);
        e.preventDefault();
        input.value = '';
    }

    function refreshChannels() {
        var channelLists = document.getElementsByClassName(CLASS_CHANNEL_LIST);
        for(var i=0; i<channelLists.length; i++) {
            var channelList = channelLists[i];
            switch(channelList.nodeName.toLowerCase()) {
                case 'select':
                    var selectContent = '';
                    for(var j=0; j<activeChannels.length; j++)
                        selectContent += '<option class="' + CLASS_CHANNEL_LIST_ENTRY + '">' + activeChannels[j] + '</option>';
                    channelList.innerHTML = selectContent;
                    break;
                default:
                    var listContent = '<ul>';
                    for(var k=0; k<activeChannels.length; k++)
                        listContent += '<li class="' + CLASS_CHANNEL_LIST_ENTRY + '">' + activeChannels[k] + '</li>';
                    listContent += '</ul>';
                    channelList.innerHTML = listContent;
                    break;
            }
        }
    }

    function logToChannel(path, content) {
        content = content
            .replace(/{\$channel}/gi, path);
        var channelContainers = document.getElementsByClassName(CLASS_CHANNEL_CONTAINER);
        for(var i=0; i<channelContainers.length; i++) {
            var channelContainer = channelContainers[i];
            var channelOutputs = channelContainer.getElementsByClassName('channel:' + path);
            if(channelOutputs.length === 0) {
                var newChannel = document.createElement('fieldset');
                newChannel.setAttribute('class', CLASS_CHANNEL + ' channel:' + path);
                channelContainer.appendChild(newChannel);
                newChannel.innerHTML = "<legend>Channel: " + path + "</legend>";
                newChannel.innerHTML += CHANNEL_CONTENT_DEFAULT
                    .replace(/{\$channel}/gi, path);
                if(activeChannels.indexOf(path) === -1)
                    activeChannels.push(path);
                refreshChannels();
            }
            var contentTarget = channelOutputs[0].getElementsByClassName(CLASS_CHANNEL_CONTENT);
            if(contentTarget.length === 0)
                contentTarget = channelOutputs;
            contentTarget[0].innerHTML += content;

            contentTarget[0].scrollTop = contentTarget[0].scrollHeight;
        }
    }

})();
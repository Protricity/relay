/**
 * Created by ari on 6/19/2015.
 */

(function() {

    var CLASS_FORM_SOCKET_COMMAND = 'form-websocket-command';

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';
    var CLASS_CHANNEL_CONTAINER = 'channel-container';
    var CLASS_CHANNEL_LIST = 'channel-list';
    var CLASS_CHANNEL_LIST_ENTRY = 'channel-list-entry';

    function getSocketWorker() {
        if(typeof getSocketWorker.socketWorker === 'undefined') {
            var socketWorker = new Worker('worker.js');
            socketWorker.addEventListener('message', function(e) {
                receiveMessage(e.data || e.detail);
            }, true);
            getSocketWorker.socketWorker = socketWorker;
        }
        return getSocketWorker.socketWorker;
    }


    document.addEventListener('socket', function(e) {
        var commandString = e.detail || e.data;
        getSocketWorker().postMessage(commandString);
        e.preventDefault();
    });
    document.addEventListener('message', function(e) {
        receiveMessage(e.data || e.detail);
    });

    document.addEventListener('command', function(e) {
        var commandString = e.detail || e.data;
        getSocketWorker().postMessage(commandString);
        e.preventDefault();
    });

    function receiveMessage(responseString) {
        var args = /^\w+/.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var command = args[0].toLowerCase();
        switch(command) {
            case 'log':
                logToChannel(responseString);
                break;

            default:
                console.error("Unhandled client-side command: " + responseString);
                break;
        }
    }

    function logToChannel(commandString) {
        var args = /^log(?:.(\w+))?\s+(\S+)\s*([\s\S]*)$/mi.exec(commandString);
        if(!args)
            throw new Error("Invalid Log: " + commandString);
        var subCommand = args[1] ? args[1].toLowerCase() : 'append';
        var channelPath = args[2];
        //var channelPathClass = CLASS_CHANNEL + ':' + channelPath;
        //var channelSelector = args[3];
        var content = args[3];

        //content = content
        //    .replace(/{\$attr_class}/gi, CLASS_CHANNEL + ' ' + channelPath)
        //    .replace(/{\$channel_class}/gi, channelPath)
        //    .replace(/{\$path}/gi, channelPath);

        var match;
        while(match = /<script([^>]*)><\/script>/gi.exec(content)) {
            var scriptContent = match[0];
            content = content.replace(scriptContent, '');
            var match2 = /\s*src=['"]([^'"]*)['"]/gi.exec(match[1]);
            if(match2) {
                var hrefValue = match2[1];
                var oldScript = document.querySelector('script[src=' + hrefValue.replace(/[/.:~]/g, '\\$&') + ']');
                if(!oldScript) {
                    //oldScript.parentNode.removeChild(oldScript);
                    var newScript = document.createElement('script');
                    newScript.setAttribute('src', hrefValue);
                    document.getElementsByTagName('head')[0].appendChild(newScript);
                    //console.log("Inserted: ", newScript, oldScript);
                }
            } else {
                console.error("Invalid Script: " + scriptContent);
            }
        }

        var htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = content;
        var contentElement = htmlContainer.firstChild;
        if(contentElement) {

        } else {
            if(content)
                throw new Error("First child missing");
            contentElement = document.createTextNode('');
        }

        var channelContainers = document.getElementsByClassName(CLASS_CHANNEL_CONTAINER);
        for(var i=0; i<channelContainers.length; i++) {
            var channelContainer = channelContainers[i];
            var channelOutputs = channelContainer.getElementsByClassName(channelPath);
            var channelOutput;
            if(channelOutputs.length === 0) {

                switch(subCommand) {
                    case 'minimize':
                    case 'maximize':
                    case 'close':
                        throw new Error("Could not find class: " + channelPath);

                    //channelContainer[channelContainer.firstChild ? 'insertBefore' : 'appendChild'](contentElement, channelContainer.firstChild);
                    ////channelContainer.scrollTop = 0;
                    //break;
                    case 'replace': // TODO: verify logic
                    case 'prepend':
                    case 'append':
                        channelContainer.appendChild(contentElement);
                        //contentTarget.scrollTop = contentTarget.scrollHeight;
                        break;

                    default:
                        throw new Error("Unknown subcommand: " + subCommand);
                }

                if(channelOutputs.length === 0) {
                    console.log(channelContainer.getElementsByClassName(channelPath));
//                     contentElement.parentNode.removeChild(contentElement);
                    throw new Error("Invalid content. Missing class='" + channelPath + "'\n" + content);
                }
                channelOutput = channelOutputs[0];

            } else {
                channelOutput = channelOutputs[0];
                var contentTarget = channelOutput;
                //if(channelSelector && channelSelector !== '*') {
                //    contentTarget = channelOutput.querySelector(channelSelector);
                //    if(!contentTarget)
                //        throw new Error("Could not find selector: " + channelSelector);
                //}


                switch(subCommand) {
                    case 'minimize':
                    case 'maximize':
                    case 'close':
                        if(contentTarget.classList.contains(subCommand + 'd')) {
                            contentTarget.classList.remove(subCommand + 'd');
                        } else {
                            contentTarget.classList.remove('minimized');
                            contentTarget.classList.remove('maximized');
                            contentTarget.classList.remove('closed');
                            contentTarget.classList.add(subCommand + 'd');
                        }
                        break;


                    case 'replace':
                        //contentTarget.parentNode.insertBefore(contentElement, contentTarget);
                        //contentTarget.parentNode.removeChild(contentTarget);
                        contentTarget.innerHTML = contentElement.innerHTML;
                        //contentTarget.outerHTML = content;
                        //contentTarget.scrollTop = 0;
                        break;

                    case 'prepend':
                        contentTarget[contentTarget.firstChild ? 'insertBefore' : 'appendChild'](contentElement, contentTarget.firstChild);
                        contentTarget.scrollTop = 0;
                        break;

                    case 'append':
                        contentTarget.appendChild(contentElement);
                        contentTarget.scrollTop = contentTarget.scrollHeight;
                        break;

                    default:
                        throw new Error("Unknown subcommand: " + subCommand);
                }
            }
            var contentEvent = new CustomEvent('log', {
                bubbles: true,
                detail: content
            });
            channelOutput.dispatchEvent(contentEvent);
            contentEvent = new CustomEvent('log.' + subCommand, {
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
    //                    path = channelElements[j].getAttribute('data-path');
    //                    selectContent += '<option><a href="#JOIN ' + path + '">' + path + '</a></option>';
    //                }
    //                channelList.innerHTML = selectContent;
    //                break;
    //
    //            case 'ul':
    //                for(j=0; j<channelElements.length; j++) {
    //                    path = channelElements[j].getAttribute('data-path');
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
//
//    window.addEventListener('hashchange', onHashChange);
//    function onHashChange(e) {
//        var hashCommand = document.location.hash.replace(/^#/, '');
//        if(!hashCommand)
//            return false;
//
//        var commandEvent = new CustomEvent('command', {
//            detail: hashCommand,
//            cancelable:true,
//            bubbles:true
//        });
//        document.dispatchEvent(commandEvent);
//        if(!commandEvent.defaultPrevented)
//            socketWorker.postMessage(hashCommand);
//
//        document.location.hash = '';
////         document.location.href = document.location.origin + document.location.pathname;
//    }
})();

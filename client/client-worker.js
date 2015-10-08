/**
 * Created by ari on 6/19/2015.
 */

function ClientWorker() {
    return ClientWorker.getSocketWorker();
}

ClientWorker.includeScript = function(scriptPath) {
    var head = document.getElementsByTagName('head')[0];
    if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', scriptPath);
        head.appendChild(newScript);
        return true;
    }
    return false;
};

ClientWorker.includeLink = function(linkPath) {
    var head = document.getElementsByTagName('head')[0];
    if (head.querySelectorAll('link[href=' + linkPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('link');
        newScript.setAttribute('href', linkPath);
        head.appendChild(newScript);
        return true;
    }
    return false;
};

//ClientLoader.includeScript('client/theme/base/base-client-loader.js');

(function() {

    var CLASS_CHANNEL = 'channel';
    var CLASS_CHANNEL_CONTENT = 'channel-content';
    var CLASS_CHANNEL_CONTAINER = 'channel-container';
    var CLASS_CHANNEL_LIST = 'channel-list';
    var CLASS_CHANNEL_LIST_ENTRY = 'channel-list-entry';

    var socketWorker = null;
    ClientWorker.getSocketWorker = function() {
        if(!socketWorker) {
            socketWorker = new Worker('worker.js');
            socketWorker.addEventListener('message', function(e) {
                ClientWorker.handleResponse(e.data || e.detail);
            }, true);
        }
        return socketWorker;
    };

    document.addEventListener('command', function(e) {
        var commandString = e.detail || e.data;
        ClientWorker.sendCommand(commandString);
        e.preventDefault();
    });

    window.addEventListener('hashchange', onHashChange);
    //window.onbeforeunload = function (e) {
    //    return "Relay client will disconnect";
    //}

    function onHashChange(e) {
        var hashCommand = document.location.hash.replace(/^#/, '').trim();
        document.location.hash = '';
        if(!hashCommand)
            return false;
        console.log("Hash Command: ", hashCommand);
        ClientWorker.sendCommand(hashCommand);
    }


    ClientWorker.sendCommand = function (commandString) {
        ClientWorker.getSocketWorker()
            .postMessage(commandString);
    };

    ClientWorker.handleResponse = function(responseString) {
        var args = /^\w+/.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var command = args[0].toLowerCase();
        switch(command) {
            case 'render':
                render(responseString);
                break;

            case 'minimize':
            case 'maximize':
            case 'close':
                windowCommand(responseString);
                break;

            default:
                console.error("Unhandled client-side command: " + responseString);
                break;
        }
    };

    function windowCommand(commandString) {
        var args = /^(minimize|maximize|close)\s+(\S+)/mi.exec(commandString);
        if(!args)
            throw new Error("Invalid Command: " + commandString);

        var command = args[1].toLowerCase();
        var targetClass = args[2];
        var targetElements = document.getElementsByClassName(targetClass);
        if(targetElements.length === 0)
            throw new Error("Class not found: " + targetClass);

        var targetElement = targetElements[0];

        if(targetElement.classList.contains(command + 'd')) {
            targetElement.classList.remove(command + 'd');
        } else {
            targetElement.classList.remove('minimized');
            targetElement.classList.remove('maximized');
            targetElement.classList.remove('closed');
            targetElement.classList.add(command + 'd');
        }
    }

    function render(commandString) {
        var args = /^render\s+(\S+)\s*([\s\S]*)$/mi.exec(commandString);
        if(!args)
            throw new Error("Invalid Render: " + commandString);

        var renderAction = 'replace';
        var targetClass = args[1];
        var content = args[2];

        var match;
        while(match = /<script([^>]*)><\/script>/gi.exec(content)) {
            var scriptContent = match[0];
            content = content.replace(scriptContent, '');
            var match2 = /\s*src=['"]([^'"]*)['"]/gi.exec(match[1]);
            if(match2) {
                var hrefValue = match2[1];
                ClientWorker.includeScript(hrefValue);

            } else {
                throw new Error("Invalid Script: " + scriptContent);
            }
        }

        var htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = content;
        var contentElement = htmlContainer.children[0];
        if(!contentElement)
            throw new Error("First child missing", console.log(commandString, content, htmlContainer));

        if(contentElement.classList.contains('append'))
            renderAction = 'append';
        if(contentElement.classList.contains('prepend'))
            renderAction = 'prepend';

        var targetElements = document.getElementsByClassName(targetClass);

        var targetElement;
        if(targetElements.length === 0) {
            document.getElementsByTagName('body')[0].appendChild(contentElement);

            if(targetElements.length === 0)
                throw new Error("Invalid content. Missing class='" + targetClass + "'\n" + content);

        }
        targetElement = targetElements[0];

        switch(renderAction) {
            case 'replace':
                targetElement.parentNode.insertBefore(contentElement, targetElement);
                targetElement.parentNode.removeChild(targetElement);
                targetElement = contentElement;
                //targetElement.outerHTML = content; //  = contentElement.outerHTML;
                break;

            case 'prepend':
                targetElement
                    [targetElement.firstChild ? 'insertBefore' : 'appendChild']
                    (contentElement, targetElement.firstChild);
                targetElement.scrollTop = 0;
                break;

            case 'append':
                targetElement.appendChild(contentElement);
                targetElement.scrollTop = targetElement.scrollHeight;
                break;

            default:
                throw new Error("Unknown render action: " + renderAction);
        }

        var contentEvent = new CustomEvent('render', {
            bubbles: true,
            detail: content
        });
        targetElement.dispatchEvent(contentEvent);

    }
})();

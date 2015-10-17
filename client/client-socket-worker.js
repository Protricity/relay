/**
 * Created by ari on 6/19/2015.
 */

function ClientSocketWorker() {
    return ClientSocketWorker.get();
}

(function() {
    var NO_CLASS = '__no-class';

    var socketWorker = null;
    ClientSocketWorker.get = function() {
        if(!socketWorker) {
            socketWorker = new Worker('worker.js');
            socketWorker.addEventListener('message', function(e) {
                ClientSocketWorker.handleResponse(e.data || e.detail);
            }, true);
        }
        return socketWorker;
    };

    document.addEventListener('command', function(e) {
        var commandString = e.detail || e.data;
        ClientSocketWorker.sendCommand(commandString);
        e.preventDefault();
    });

    window.addEventListener('hashchange', onHashChange);
    //window.onbeforeunload = function (e) {
    //    return "Relay client will disconnect";
    //}

    function onHashChange(e) {
        var hashCommand = decodeURIComponent(document.location.hash.replace(/^#/, '').trim());
        document.location.hash = '';
        if(!hashCommand)
            return false;
        console.log("Hash Command: ", hashCommand);
        ClientSocketWorker.sendCommand(hashCommand);
    }


    ClientSocketWorker.sendCommand = function (commandString) {
        ClientSocketWorker.get()
            .postMessage(commandString);
    };

    ClientSocketWorker.handleResponse = function(responseString) {
        var args = /^\w+/.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var command = args[0].toLowerCase();

        switch(command) {
            case 'render':
                render(responseString);
                break;

            case 'replace':
            case 'append':
            case 'prepend':
                renderClass(responseString);
                break;

            case 'minimize':
            case 'maximize':
            case 'close':
                renderWindowCommand(responseString);
                break;

            default:
                console.error("Unhandled client-side command: " + responseString);
                break;
        }
    };

    function renderWindowCommand(commandString) {
        var args = /^(minimize|maximize|close)\s+(\S+)$/mi.exec(commandString);
        if(!args)
            throw new Error("Invalid Command: " + commandString);

        var command = args[1].toLowerCase();
        var targetClass = args[2];
        var targetElements = document.getElementsByClassName(targetClass);
        if(targetElements.length === 0)
            throw new Error("Class not found: " + targetClass);

        var targetElement = targetElements[0];
        var hasClass = targetElement.classList.contains(command + 'd');

        switch(command) {
            case 'maximize':
                var maximizedElms = document.getElementsByClassName('maximized');
                while(maximizedElms.length > 0)
                    maximizedElms[0].classList.remove('maximized');
                break;
            default:
                break;
        }

        if(hasClass) {
            targetElement.classList.remove(command + 'd');

        } else {
            targetElement.classList.remove('minimized');
            targetElement.classList.remove('maximized');
            targetElement.classList.remove('closed');
            targetElement.classList.add(command + 'd');
        }

    }

    function renderClass(commandString) {
        var args = /^(replace|append|prepend)\s+(\S+)\s+([\s\S]+)$/mi.exec(commandString);
        if (!args)
            throw new Error("Invalid Class Args: " + commandString);

        var command = args[1].toLowerCase();
        var targetClass = args[2];
        var content = args[3];

        var includeScripts = [];
        content = parseScripts(content, includeScripts);

        var htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = content;
        var contentElements = htmlContainer.children;
        if(contentElements.length === 0)
            throw new Error("First child missing", console.log(content, htmlContainer));

        var contentElement = htmlContainer.children[0];     // First Child

        var targetElement;
        switch(command) {
            case 'replace': // Replaces inner content of target element
                var replaceElements = document.getElementsByClassName(targetClass);
                if(replaceElements.length === 0)
                    throw new Error("Invalid content. Missing class='" + targetClass + "'\n" + content);

                targetElement = replaceElements[0];
                //targetElement.innerHTML = '';

                while(contentElements.length > 0)
                    targetElement.parentNode.insertBefore(contentElements[0], targetElement);

                targetElement.parentNode.removeChild(targetElement);
                targetElement = contentElement;
                break;

            case 'prepend': // Prepends inner content to target element
                var prependTargets = document.getElementsByClassName(targetClass);
                if(prependTargets.length === 0)
                    throw new Error("Invalid prepend content. Missing class='" + targetClass + "'\n" + content);
                targetElement = prependTargets[0];

                if(targetElement.firstChild) {
                    while(contentElements.length > 0)
                        targetElement.insertBefore(contentElements[contentElements.length-1], targetElement.firstChild);
                } else {
                    while(contentElements.length > 0)
                        targetElement.appendChild(contentElements[0]);
                }
                targetElement.scrollTop = 0;
                break;

            case 'append': // Appends inner content to target element
                var appendTargets = document.getElementsByClassName(targetClass);
                if(appendTargets.length === 0)
                    throw new Error("Invalid append content. Missing class='" + targetClass + "'\n" + content);
                targetElement = appendTargets[0];

                while(contentElements.length > 0)
                    targetElement.appendChild(contentElements[0]);
                targetElement.scrollTop = targetElement.scrollHeight;
                break;

            default:
                throw new Error("Invalid Command: " + command);
        }

        // Include scripts after insert:
        for(var ii=0; ii<includeScripts.length; ii++)
            ClientSocketWorker.includeScript(includeScripts[ii]);

        var contentEvent = new CustomEvent(command, {
            bubbles: true
        });
        targetElement.dispatchEvent(contentEvent);
    }

    function render(commandString) {
        var args = /^render\s+([\s\S]+)$/mi.exec(commandString);
        if (!args)
            throw new Error("Invalid Command: " + commandString);

        var content = args[1];
        var includeScripts = [];
        content = parseScripts(content, includeScripts);

        var htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = content;
        var contentElements = htmlContainer.children;
        if(contentElements.length === 0) {
            htmlContainer.innerHTML = '<article class="' + NO_CLASS + '">' + content + '</article>';
            var contentElements = htmlContainer.children;
            if(contentElements.length === 0) 
                throw new Error("First child missing", console.log(content, htmlContainer));
        }

        var contentElement = htmlContainer.children[0];     // First Child
        if(contentElement.classList.length === 0)
            contentElement.classList.add('__no-class');
        var targetClass = contentElement.classList.item(0);

        var targetElements = document.getElementsByClassName(targetClass);
        var targetElement;
        if(targetElements.length === 0) {
            var bodyElm = document.getElementsByTagName('body')[0];
            while(contentElements.length > 0)
                bodyElm.appendChild(contentElements[0]);

            if(targetElements.length === 0)
                throw new Error("Shouldn't Happen. Missing class='" + targetClass + "'\n" + content);
            targetElement = targetElements[0];

        } else {
            targetElement = targetElements[0];

            while(contentElements.length > 0)
                targetElement.parentNode.insertBefore(contentElements[contentElements.length - 1], targetElement);
            targetElement.parentNode.removeChild(targetElement);
            targetElement = contentElement;
        }

        // Include scripts after insert:
        for(var ii=0; ii<includeScripts.length; ii++)
            ClientSocketWorker.includeScript(includeScripts[ii]);

        var contentEvent = new CustomEvent('render', {
            bubbles: true
        });
        targetElement.dispatchEvent(contentEvent);
    }

    function parseScripts(content, includeScripts) {
        var match;
        while(match = /<script([^>]*)><\/script>/gi.exec(content)) {
            var scriptContent = match[0];
            content = content.replace(scriptContent, '');
            var match2 = /\s*src=['"]([^'"]*)['"]/gi.exec(match[1]);
            if(match2) {
                var hrefValue = match2[1];
                includeScripts.push(hrefValue);

            } else {
                throw new Error("Invalid Script: " + scriptContent);
            }
        }
        return content;
    }
})();


ClientSocketWorker.includeScript = function(scriptURL) {
    var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(scriptURL);
    if(!match)
        throw new Error("Invalid URL: " + scriptURL);
    var host = match[4],
        scriptPath = match[5].toLowerCase() || '';
    if(host)
        throw new Error("Only local scripts may be included: " + scriptPath);

    var head = document.getElementsByTagName('head')[0];
    if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', scriptPath);
        head.appendChild(newScript);
        return true;
    }
    return false;
};
//
//ClientSocketWorker.includeLink = function(linkPath) {
//    var head = document.getElementsByTagName('head')[0];
//    if (head.querySelectorAll('link[href=' + linkPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
//        var newScript = document.createElement('link');
//        newScript.setAttribute('href', linkPath);
//        head.appendChild(newScript);
//        return true;
//    }
//    return false;
//};

//ClientLoader.includeScript('client/theme/base/base-client-loader.js');
/**
 * Created by ari on 6/19/2015.
 */

function ClientSocketWorker() {
    return ClientSocketWorker.get();
}

(function() {
    var NO_CLASS = '_you_got_no-class';

    var socketWorker = null;
    document.addEventListener('click', onClickEvent, false);
    document.addEventListener('dblclick', onDblClick, false);
    document.addEventListener('command', onCommandEvent, false);
    window.addEventListener('hashchange', onHashChange, false);

    ClientSocketWorker.get = function() {
        if(!socketWorker) {
            socketWorker = new Worker('worker.js');
            socketWorker.addEventListener('message', function(e) {
                ClientSocketWorker.handleResponse(e.data || e.detail);
            }, true);
        }
        return socketWorker;
    };

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

    // Events

    function onClickEvent(e) {
        if(e.defaultPrevented
            || e.target.nodeName.toLowerCase() !== 'a'
            || !e.target.href
            || e.target.host != document.location.host)
            return;

        e.preventDefault();

        if(e.target.hash
            && e.target.host == document.location.host
            && e.target.pathname == document.location.pathname
            )
            return onHashChange(e, e.target.hash);

        var commandString = "GET " + e.target.href;
        ClientSocketWorker.sendCommand(commandString);
    }

    function onDblClick(e) {
        var target = e.target;
        while(target = target.parentNode) {
            var aMaxAnchor = target.querySelector('a[href*=MAXIMIZE]');
            if(aMaxAnchor){
//                 console.log(aMaxAnchor);
                var commandString = aMaxAnchor
                    .getAttribute('href')
                    .replace(/^#/,'');
                ClientSocketWorker.sendCommand(commandString);
                return;
            }
        }
    }

    function onCommandEvent(e) {
        e.preventDefault();
        var commandString = e.detail || e.data;
        ClientSocketWorker.sendCommand(commandString);
    }

    function onHashChange(e, hash) {
        hash = hash || document.location.hash;
        var hashCommand = decodeURIComponent(hash.replace(/^#/, '').trim());
        document.location.hash = '';
        if(!hashCommand)
            return false;
        e.preventDefault();
        console.info("Hash Command: ", hashCommand);
        ClientSocketWorker.sendCommand(hashCommand);
    }




    function renderWindowCommand(commandString) {
        var args = /^(minimize|maximize|close)\s+(\S+)$/mi.exec(commandString);
        if(!args)
            throw new Error("Invalid Command: " + commandString);

        var command = args[1].toLowerCase();
        var targetClass = args[2];
        var targetElements = document.getElementsByClassName(targetClass);
        if(targetElements.length === 0)
            throw new Error("Class not found: " + targetClass + " - " + commandString);

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

        for(var i=0; i<targetElements.length; i++) {
            targetElement = targetElements[i];
            if(hasClass) {
                targetElement.classList.remove(command + 'd');

            } else {
                targetElement.classList.remove('minimized');
                targetElement.classList.remove('maximized');
                targetElement.classList.remove('closed');
                targetElement.classList.add(command + 'd');
            }
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
        content = ClientSocketWorker.parseScripts(content, includeScripts);
        content = ClientSocketWorker.parseStyleSheets(content, includeScripts);

        var htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = content;
        var contentElements = htmlContainer.children;
        if(contentElements.length === 0)
            throw new Error("First child missing", console.log(content, htmlContainer));

        var contentElement = htmlContainer.children[0];     // First Child

        var targetElement;
        switch(command) {
            case 'replace': // Replaces entire target element
                var replaceElements = document.getElementsByClassName(targetClass);
                if(replaceElements.length === 0)
                    throw new Error("Invalid content. Missing class='" + targetClass + "'\n" + content);

                targetElement = replaceElements[0];
                //targetElement.innerHTML = '';

                targetElement.parentNode.insertBefore(contentElement, targetElement);

                // Remove existing element
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
        includeScriptsAsync(targetElement, includeScripts, function() {
            var contentEvent = new CustomEvent('render', {
                bubbles: true
            });
            targetElement.dispatchEvent(contentEvent);
        });
    }

    function render(commandString) {
        var args = /^render\s+([\s\S]+)$/mi.exec(commandString);
        if (!args)
            throw new Error("Invalid Command: " + commandString);

        var content = args[1];
        var includeScripts = [];
        content = ClientSocketWorker.parseScripts(content, includeScripts);
        content = ClientSocketWorker.parseStyleSheets(content, includeScripts);

        var htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = content;
        var contentElements = htmlContainer.children;
        if(contentElements.length === 0) {
            htmlContainer.innerHTML = '<article class="' + NO_CLASS + '">' + content + '</article>';
            contentElements = htmlContainer.children;
            if(contentElements.length === 0) 
                throw new Error("First child missing", console.log(content, htmlContainer));
        }

        var contentElement = contentElements[0];     // First Child
        if(contentElement.classList.length === 0)
            contentElement.classList.add('__no-class');
        var targetClass = contentElement.classList.item(0);

        var maximizedElms = document.getElementsByClassName('maximized');
        while(maximizedElms.length > 0)
            maximizedElms[0].classList.remove('maximized');

        contentElement.classList.add('maximized');

        var targetElements = document.getElementsByClassName(targetClass);
        var targetElement;
        if(targetElements.length === 0) {
            var bodyElm = document.getElementsByTagName('body')[0];


            //while(contentElements.length > 0)
            bodyElm.appendChild(contentElement);

            if(targetElements.length === 0)
                throw new Error("Shouldn't Happen. Missing class='" + targetClass + "'\n" + content);
            targetElement = targetElements[0];

        } else {

            // Existing window with same name
            targetElement = targetElements[0];
            //replaceHTMLContent(targetElement, contentElement);

            targetElement.parentNode.insertBefore(contentElement, targetElement);
            targetElement.parentNode.removeChild(targetElement);
            targetElement = contentElement;
        }

        // Include scripts after insert:
        includeScriptsAsync(targetElement, includeScripts, function() {
            var contentEvent = new CustomEvent('render', {
                bubbles: true
            });
            targetElement.dispatchEvent(contentEvent);
        });
    }

    function replaceHTMLContent(oldElement, newElement) {
        if(oldElement.nodeType !== newElement.nodeType)
            return replace();

        if(oldElement.nodeName !== newElement.nodeName)
            return replace();

        switch(newElement.nodeType) {
            case Node.ELEMENT_NODE:
                for(var i=0; i<newElement.attributes.length; i++)
                    if(oldElement.attributes[i].toString() !== newElement.attributes[i].toString())
                        return replace();

                if(newElement.children.length > 0) {
                    for(i=0; i<newElement.childNodes.length; i++) {
                        if(i>=oldElement.childNodes.length) {
                            oldElement.appendChild(newElement.childNodes[i]);
                        } else {
                            replaceHTMLContent(oldElement.childNodes[i], newElement.childNodes[i]);
                        }
                    }

                } else {
                    if(oldElement.innerHTML !== newElement.innerHTML)
                        return replace();
                }
                break;

            case Node.TEXT_NODE:
                if(oldElement.innerHTML !== newElement.innerHTML)
                    return replace();
                break;
        }


//         console.log("Match: ", newElement, oldElement);

        function replace() {
//             console.log("Mismatch: ", newElement, oldElement);
            oldElement.parentNode.insertBefore(newElement, oldElement);
            oldElement.parentNode.removeChild(oldElement);
        }
    }

    function includeScriptsAsync(targetElement, scripts, callback) {
        if(scripts.length > 0) {
            var script = scripts.shift();
            ClientSocketWorker.includeScript(script, function() {
                includeScriptsAsync(targetElement, scripts, callback);
            });

        } else {
            if(callback)
                callback();
        }
    }
})();


ClientSocketWorker.parseStyleSheets = function(content, includeScripts) {
    var match;
    while(match = /<link([^>]*)\/?>(<\/link>)?/gi.exec(content)) {
        var linkContent = match[0];
        content = content.replace(linkContent, '');
        var match3 = /\s*href=['"]([^'"]*)['"]/gi.exec(match[1]);
        if(match3) {
            var hrefValue = match3[1];
            includeScripts.push(hrefValue);

        } else {
            throw new Error("Invalid Script: " + linkContent);
        }
    }
    return content;
};

ClientSocketWorker.parseScripts = function(content, includeScripts) {
    var match;
    while(match = /<script([^>]*)><\/script>/gi.exec(content)) {
        var scriptContent = match[0];
//             console.log(scriptContent);
        content = content.replace(scriptContent, '');
        var match2 = /\s*src=['"]([^'"]*)['"]/gi.exec(match[1]);
        if(match2) {
            var srcValue = match2[1];
            includeScripts.push(srcValue);

        } else {
            throw new Error("Invalid Script: " + scriptContent);
        }
    }
    return content;
};

ClientSocketWorker.includeScript = function(styleSheetURL, callback) {
    var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(styleSheetURL);
    if(!match)
        throw new Error("Invalid URL: " + styleSheetURL);

    var host = match[4],
        scriptPath = match[5].toLowerCase() || '';
    if(host)
        throw new Error("Only local scripts may be included: " + scriptPath);

    var headElm = document.getElementsByTagName('head')[0];

    var ext = scriptPath.split('.').pop();
    switch(ext.toLowerCase()) {
        case 'js':
            var scriptQuery = headElm.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']');
            if (scriptQuery.length === 0) {
                var newScript = document.createElement('script');
                newScript.setAttribute('src', scriptPath);
                newScript.onload = callback;
                headElm.appendChild(newScript);
                // console.log("Including Script: ", newScript);

                return true;
            }
            break;

        case 'css':
            var linkQuery = headElm.querySelectorAll('link[href=' + scriptPath.replace(/[/.]/g, '\\$&') + ']');
            if (linkQuery.length === 0) {
                var newLink = document.createElement('link');
                newLink.setAttribute('href', scriptPath);
                newLink.setAttribute('rel', 'stylesheet');
                newLink.setAttribute('type', 'text/css');
                newLink.onload = callback;
                headElm.appendChild(newLink);
                // console.log("Including StyleSheet: ", newScript);

                return true;
            }
            break;

        default:
            throw new Error("Invalid extension: " + ext);
    }

    if(callback)
        callback();

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
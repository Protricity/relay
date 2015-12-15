/**
 * Created by ari on 6/19/2015.
 */

function Client() {
    return Client.get();
}

(function() {
    var NO_CLASS = '_you_got_no-class';

    var socketWorker = null;
    //document.addEventListener('click', onClickEvent, false); // TODO: handle links globally? probably bad idea
//    document.addEventListener('dblclick', onDblClick, false);
    document.addEventListener('command', onCommandEvent, false);
    window.addEventListener('hashchange', onHashChange, false);

    Client.get = function() {
        if(!socketWorker) {
            socketWorker = new Worker('worker.js');
            socketWorker.addEventListener('message', function(e) {
                Client.processResponse(e.data || e.detail);
            }, true);
        }
        return socketWorker;
    };

    Client.execute = function (commandString) {
        Client.get()
            .postMessage(commandString);
    };

    Client.processResponse = function(responseString) {
        var args = /^\w+/.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var command = args[0].toLowerCase();

        switch(command) {
            case 'render':
                render(responseString);
                break;

            //case 'replace':
            //case 'append':
            //case 'prepend':
            //    renderClass(responseString);
            //    break;

            case 'minimize':
            case 'maximize':
            case 'close':
                renderWindowCommand(responseString);
                break;

            case 'focus':
                focusWindowCommand(responseString);
                break;

            case 'event':
                // TODO: response?
                document.dispatchEvent(new CustomEvent('event', {
                    detail: responseString
                }));

                //document.dispatchEvent(new CustomEvent('event:' + command, {
                //    detail: responseString
                //}));
                break;

            default:
                // some responses aren't used by the client, but should be passed through the client anyway
                //console.error("Unrecognized client-side command: " + responseString);
                break;
        }


        // If host thread exists,
        if(typeof Host === 'object')
            // Send response to host thread
            Host.processResponse(responseString);
    };

    // Events

    function onClickEvent(e) {
        var target = e.target;
        while(target = target.parentNode) {
            var aMinAnchor = target.querySelector('a[href*=MINIMIZE]');
            if(aMinAnchor){
                 console.log(aMinAnchor, e);
                var commandString = aMinAnchor
                    .getAttribute('href')
                    .replace(/^#/,'');
                Client.execute(commandString);
                return;
            }
        }

        //
        //if(e.defaultPrevented
        //    || e.target.nodeName.toLowerCase() !== 'a'
        //    || !e.target.href
        //    || e.target.host != document.location.host)
        //    return;
        //
        //e.preventDefault();
        //
        //if(e.target.hash
        //    && e.target.host == document.location.host
        //    && e.target.pathname == document.location.pathname
        //    )
        //    return onHashChange(e, e.target.hash);
        //
        //var commandString = "GET " + e.target.href;
        //Client.execute(commandString);
    }

    function onDblClick(e) {
        var target = e.target;
        while(target = target.parentNode) {
            var aMaxAnchor = target.querySelector('a[href*=MINIMIZE]');
            if(aMaxAnchor){
                 console.log(aMaxAnchor);
                var commandString = aMaxAnchor
                    .getAttribute('href')
                    .replace(/^#/,'');
                Client.execute(commandString);
                return;
            }
        }
    }

    function onCommandEvent(e) {
        e.preventDefault();
        var commandString = e.detail || e.data;
        Client.execute(commandString);
    }

    function onHashChange(e, hash) {
        hash = hash || document.location.hash;
        var hashCommand = decodeURIComponent(hash.replace(/^#/, '').trim());
        document.location.hash = '';
        if(!hashCommand)
            return false;
        e.preventDefault();
        console.info("Hash Command: ", hashCommand);
        Client.execute(hashCommand);
    }

    function focusWindowCommand(responseString) {
        var args = /^(focus)\s+(\S+)$/mi.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var targetClass = args[2];
        var targetElements = document.getElementsByClassName(targetClass);
        if(targetElements.length === 0)
            throw new Error("Class not found: " + targetClass + " - " + responseString);

        var focusedElms = document.getElementsByClassName('focused');
        while(focusedElms.length > 0)
            focusedElms[0].classList.remove('focused');
        var maximizedElms = document.getElementsByClassName('maximized');
        while(maximizedElms.length > 0)
            maximizedElms[0].classList.remove('maximized');

        var targetElement = targetElements[0];
        targetElement.classList.add("focused");

        document.body.scrollTop = targetElement.offsetTop;

        var focusInput = targetElement.querySelector('.focus-input')
            || targetElement.querySelector('input[type=text]')
            || targetElement.querySelector('textarea')
            || targetElement.querySelector('select');
        if(focusInput)
            focusInput.focus();
    }


    function render(commandString) {
        var args = /^render\s+([\s\S]+)$/mi.exec(commandString);
        if (!args)
            throw new Error("Invalid Command: " + commandString);

        var content = args[1];
        var includeScripts = [];
        content = Client.parseScripts(content, includeScripts);
        content = Client.parseStyleSheets(content, includeScripts);

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

            
        var targetElements = document.getElementsByClassName(targetClass);
        var targetElement;
        if(targetElements.length === 0) {
            // First Render
            var bodyElm = document.getElementsByTagName('body')[0];

            var insertBefore;
            for(var i=0; i<bodyElm.children.length; i++)
                if(bodyElm.children[i].nodeName.toLowerCase() === 'article') {
                    insertBefore = bodyElm.children[i];
                    break;
                }

            if(insertBefore && contentElement.classList.contains('prepend-on-render'))
                bodyElm.insertBefore(contentElement, insertBefore);
            else
                bodyElm.appendChild(contentElement);


            if(targetElements.length === 0)
                throw new Error("Re-render class mismatch: '" + targetClass + "'\n" + content);
            targetElement = targetElements[0];

            targetElement.scrollIntoView();
        } else {
            // Existing window with same name
            targetElement = targetElements[0];
            if(targetElement.classList.contains('closed'))
                targetElement.classList.remove('closed');
            if(contentElement.classList.contains('append-children-on-render')
                || targetElement.classList.contains('append-children-on-render')) {
                for(var j=0; j<contentElement.children.length; j++)
                    targetElement.appendChild(contentElement.children[j]);

            } else {
                targetElement.innerHTML = contentElement.innerHTML;
            }

            if(contentElement.classList.contains('scroll-into-view-on-render'))
                targetElement.scrollIntoView();
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
            Client.includeScript(script, function() {
                includeScriptsAsync(targetElement, scripts, callback);
            });

        } else {
            if(callback)
                callback();
        }
    }



    function renderWindowCommand(responseString) {
        var args = /^(minimize|maximize|close)\s+(\S+)$/mi.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var command = args[1].toLowerCase();
        var targetClass = args[2];
        var targetElements = document.getElementsByClassName(targetClass);
        if(targetElements.length === 0)
            throw new Error("Class not found: " + targetClass + " - " + responseString);

        var targetElement = targetElements[0];
        var hasClass = targetElement.classList.contains(command + 'd');
        if(command === 'close')
            hasClass = false;

        var maximizedElms = document.getElementsByClassName('maximized');
        while(maximizedElms.length > 0)
            maximizedElms[0].classList.remove('maximized');

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
    //
    //function renderClass(commandString) {
    //    var args = /^(replace|append|prepend)\s+(\S+)\s+([\s\S]+)$/mi.exec(commandString);
    //    if (!args)
    //        throw new Error("Invalid Class Args: " + commandString);
    //
    //    var command = args[1].toLowerCase();
    //    var targetClass = args[2];
    //    var content = args[3];
    //
    //    var includeScripts = [];
    //    content = Client.parseScripts(content, includeScripts);
    //    content = Client.parseStyleSheets(content, includeScripts);
    //
    //    var htmlContainer = document.createElement('div');
    //    htmlContainer.innerHTML = content;
    //    var contentElements = htmlContainer.children;
    //    if(contentElements.length === 0)
    //        throw new Error("First child missing", console.log(content, htmlContainer));
    //
    //    var contentElement = htmlContainer.children[0];     // First Child
    //
    //    var targetElement;
    //    switch(command) {
    //        case 'replace': // Replaces entire target element
    //            var replaceElements = document.getElementsByClassName(targetClass);
    //            if(replaceElements.length === 0)
    //                throw new Error("Invalid content. Missing class='" + targetClass + "'\n" + content);
    //
    //            targetElement = replaceElements[0];
    //            targetElement.outerHTML = contentElement.outerHTML;
    //
    //            break;
    //
    //        case 'prepend': // Prepends inner content to target element
    //            var prependTargets = document.getElementsByClassName(targetClass);
    //            if(prependTargets.length === 0)
    //                throw new Error("Invalid prepend content. Missing class='" + targetClass + "'\n" + content);
    //            targetElement = prependTargets[0];
    //
    //            if(targetElement.firstChild) {
    //                while(contentElements.length > 0)
    //                    targetElement.insertBefore(contentElements[contentElements.length-1], targetElement.firstChild);
    //            } else {
    //                while(contentElements.length > 0)
    //                    targetElement.appendChild(contentElements[0]);
    //            }
    //            targetElement.scrollTop = 0;
    //            break;
    //
    //        case 'append': // Appends inner content to target element
    //            var appendTargets = document.getElementsByClassName(targetClass);
    //            if(appendTargets.length === 0)
    //                throw new Error("Invalid append content. Missing class='" + targetClass + "'\n" + content);
    //            targetElement = appendTargets[0];
    //
    //            while(contentElements.length > 0)
    //                targetElement.appendChild(contentElements[0]);
    //            targetElement.scrollTop = targetElement.scrollHeight;
    //            break;
    //
    //        default:
    //            throw new Error("Invalid Command: " + command);
    //    }
    //
    //    // Include scripts after insert:
    //    includeScriptsAsync(targetElement, includeScripts, function() {
    //        var contentEvent = new CustomEvent('render', {
    //            bubbles: true
    //        });
    //        targetElement.dispatchEvent(contentEvent);
    //    });
    //}
})();


Client.parseStyleSheets = function(content, includeScripts) {
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

Client.parseScripts = function(content, includeScripts) {
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

Client.includeScript = function(styleSheetURL, callback) {
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
//Client.includeLink = function(linkPath) {
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
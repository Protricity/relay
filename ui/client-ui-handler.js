
if(typeof document === 'undefined')
    throw new Error("Invalid Environment");


(function() {
    var ALLOWED_ROOT_ELEMENTS = ['article', 'nav'];

// Define outside closure
    var Client = self.Client !== 'undefined' ? self.Client : self.Client = function(){};

    document.addEventListener('command', onCommandEvent, false);
    document.addEventListener('click', onClickHandler);
    window.addEventListener('hashchange', onHashChange, false);

    var previousProcessResponseHandler = Client.processResponse;
    Client.processResponse = function(responseString) {
        var args = /^\w+/.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var command = args[0].toLowerCase();

        switch (command) {
            case 'render':
                Client.render(responseString);
                break;

            case 'replace':
            case 'append':
            case 'prepend':
                Client.renderChildren(responseString);
                break;

            case 'minimize':
            case 'maximize':
            case 'close':
            case 'open':
            case 'toggle':
                Client.handleWindowResponse(responseString);
                break;

            case 'focus':
                Client.handleFocusResponse(responseString);
                break;

            case 'event':
            default:
                // some responses aren't used by the client, but should be passed through the client anyway
                //console.error("Unrecognized client-side command: " + responseString);
                break;
        }

        document.dispatchEvent(new CustomEvent('response:' + command, {
            detail: responseString
        }));

        if(previousProcessResponseHandler)
            previousProcessResponseHandler(responseString);
    };




    Client.handleFocusResponse = function(responseString) {
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
    };

    Client.render = function(commandString) {
        var args = /^render\s+([\s\S]+)$/mi.exec(commandString);
        if (!args)
            throw new Error("Invalid Command: " + commandString);

        var htmlContent = args[1];
        var includeScripts = [];
        htmlContent = Client.parseScripts(htmlContent, includeScripts);
        htmlContent = Client.parseStyleSheets(htmlContent, includeScripts);

        var htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = htmlContent;
        var contentElements = htmlContainer.children;
        if(contentElements.length === 0)
            throw new Error("First child missing", console.log(htmlContent, htmlContainer));

        var contentElement = contentElements[0];     // First Child
        if(contentElement.classList.length === 0)
            throw new Error("Rendered content must have at least one class attribute set");

        var targetClass = contentElement.classList.item(0);

        var targetElements = document.getElementsByClassName(targetClass);
        if(targetElements.length > 0) {
            console.warn("Ignoring already-rendered content: ", targetClass, contentElement);
            return;
        }

        // Ignore if not a root element
        if(ALLOWED_ROOT_ELEMENTS.indexOf(contentElement.nodeName.toLowerCase()) === -1) {
            console.warn("Ignoring non-root element: ", contentElement);
            return;
        }

        var bodyElm = document.getElementsByTagName('body')[0];

        var insertBefore;
        for(var i=0; i<bodyElm.children.length; i++)
            if(bodyElm.children[i].nodeName.toLowerCase() === 'article') {
                insertBefore = bodyElm.children[i];
                break;
            }

        if(insertBefore) //  && contentElement.classList.contains('prepend-on-render')
            bodyElm.insertBefore(contentElement, insertBefore);
        else
            bodyElm.appendChild(contentElement);


        if(targetElements.length === 0)
            throw new Error("Re-render class mismatch: '" + targetClass + "'\n" + htmlContent);
        var targetElement = targetElements[0];


        if(contentElement.classList.contains('maximized')) {
            // Remove all other maximized
            var maximizedElms = document.getElementsByClassName('maximized');
            while(maximizedElms.length > 0)
                maximizedElms[0].classList.remove('maximized');
            targetElement.classList.add('maximized');

            // Move to top of the list
            while(targetElement.previousSibling
            && targetElement.previousSibling.nodeName === targetElement.nodeName)
                targetElement.parentNode.insertBefore(targetElement, targetElement.previousSibling);
            targetElement.scrollIntoView();
        }

        // Include scripts after render
        Client.includeScriptsAsync(includeScripts, function() {
            var contentEvent = new CustomEvent('render', {
                bubbles: true
            });
            targetElement.dispatchEvent(contentEvent);
        });
    };

    Client.renderChildren = function(responseString) {
        var args = /^(replace|append|prepend)\s+(\S+)\s+([\s\S]+)$/mi.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var renderCommand = args[1].toLowerCase();
        var targetClass = args[2];
        var htmlContent = args[3];

        var htmlContainer = document.createElement('span');
        htmlContainer.innerHTML = htmlContent;
        if(htmlContainer.children.length > 0)
            htmlContainer = htmlContainer.children[0];

        var targetElements = document.getElementsByClassName(targetClass);
        if(targetElements.length > 0) {
           for(var i=0; i<targetElements.length; i++) {
               var targetElement = targetElements[i];
               switch(renderCommand) {
                   case 'replace':
                       targetElement.innerHTML = htmlContent;
                       break;

                   case 'append':
                       targetElement.appendChild(htmlContainer);
                       targetElement.scrollTop = targetElement.scrollHeight; // TODO: always?
                       break;

                   case 'prepend':
                       targetElement.prependChild(htmlContainer);
                       break;
               }
           }

        } else {
            console.info("No target classes found for: " + targetClass, responseString)
        }
    };


    Client.handleWindowResponse = function (responseString) {
        var args = /^(minimize|maximize|close|open|toggle)\s+(\S+)$/mi.exec(responseString);
        if(!args)
            throw new Error("Invalid Command: " + responseString);

        var command = args[1].toLowerCase();
        var targetClass = args[2];
        var targetElements = document.getElementsByClassName(targetClass);
        if(targetElements.length === 0)
            throw new Error("Class not found: " + targetClass + " - " + responseString);

        // var targetElement = targetElements[0];
        // for(var i=0; i<targetElements.length; i++) {
        var targetElement = targetElements[0];

        var isHidden = targetElement.classList.contains('minimized')
            || targetElement.classList.contains('closed')
            || targetElement.offsetParent === null;

        switch(command) {
            case 'toggle':
                targetElement.classList.remove('closed');
                if(isHidden) {
                    targetElement.classList.remove('minimized');
                    //targetElement.classList.add('maximized');
                } else {
                    targetElement.classList.add('minimized');
                    targetElement.classList.remove('maximized');
                }

                break;

            case 'open':
                // Remove all other maximized
                var maximizedElms = document.getElementsByClassName('maximized');
                while(maximizedElms.length > 0)
                    maximizedElms[0].classList.remove('maximized');

                targetElement.classList.remove('minimized');
                targetElement.classList.remove('maximized');
                targetElement.classList.remove('closed');

                // Move to top of the list
                while(targetElement.previousSibling
                && targetElement.previousSibling.nodeName === targetElement.nodeName)
                    targetElement.parentNode.insertBefore(targetElement, targetElement.previousSibling);

                targetElement.scrollIntoView();

                break;

            case 'close':
                if(targetElement.classList.contains('closed')) {
                    targetElement.classList.remove('closed');

                } else {
                    targetElement.classList.remove('minimized');
                    targetElement.classList.remove('maximized');
                    targetElement.classList.add('closed');
                }
                break;

            case 'minimize':
                if(targetElement.classList.contains('minimized')) {
                    // Unminimize!
                    targetElement.classList.remove('minimized');
                    targetElement.scrollIntoView(); // TODO: good idea?

                } else {
                    // Minimize!
                    targetElement.classList.remove('maximized');
                    targetElement.classList.remove('closed');
                    targetElement.classList.add('minimized');

                    // Move to bottom of the list
                    while(targetElement.nextSibling
                    && targetElement.nextSibling.nodeName === targetElement.nodeName)
                        targetElement.parentNode.insertBefore(targetElement.nextSibling, targetElement);

                    //targetElement.scrollIntoView();
                }

                break;

            case 'maximize':
                if(targetElement.classList.contains('maximized')) {
                    // Unmaximize
                    targetElement.classList.remove('maximized');

                } else {
                    // Remove all other maximized
                    var maximizedElms2 = document.getElementsByClassName('maximized');
                    while(maximizedElms2.length > 0)
                        maximizedElms2[0].classList.remove('maximized');

                    // Maximize!
                    targetElement.classList.remove('minimized');
                    targetElement.classList.remove('closed');
                    targetElement.classList.add('maximized');

                    // Move to top of the list
                    while(targetElement.previousSibling
                    && targetElement.previousSibling.nodeName === targetElement.nodeName)
                        targetElement.parentNode.insertBefore(targetElement, targetElement.previousSibling);

                    targetElement.scrollIntoView();
                }
                break;
        }
    };


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

    function onClickHandler(e) {
        var aElm = e.target;
        while(aElm && aElm.nodeName.toLowerCase() !== 'a')
            aElm = aElm.parentNode && aElm.parentNode !== document.body ? aElm.parentNode : null;
        if(!aElm)
            return;
        var href = aElm.getAttribute('href');
        if(!href || href[0] !== '#')
            return;

        var hashCommand = decodeURIComponent(href.replace(/^#/, '').trim());
        if(!hashCommand)
            return false;

        e.preventDefault();
        console.info("Hash Command: ", hashCommand);
        Client.execute(hashCommand);
    }



    function onHashChange(e, hash) {
        e.preventDefault();
        hash = hash || document.location.hash;
        document.location.hash = '';
        var hashCommand = decodeURIComponent(hash.replace(/^#/, '').trim());
        if(!hashCommand)
            return false;
        console.info("Hash Command: ", hashCommand);
        Client.execute(hashCommand, e);
    }


    function onCommandEvent(e) {
        e.preventDefault();
        var commandString = e.detail || e.data;
        Client.execute(commandString, e);
    }

    Client.includeScriptsAsync = function(scripts, callback) {
        if(scripts.length > 0) {
            var script = scripts.shift();
            Client.includeScript(script, function() {
                Client.includeScriptsAsync(scripts, callback);
            });

        } else {
            if(callback)
                callback();
        }
    };

    Client.includeScript = function(fileURL, callback) {
        var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(fileURL);
        if(!match)
            throw new Error("Invalid URL: " + fileURL);

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

    console.log("Configured Response processor as UI Handler");
})();

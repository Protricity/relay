/**
 * Created by ari on 7/2/2015.
 */


(function() {

    // Client Script
    if(typeof document === 'object')  {
        document.addEventListener('submit', onFormEvent, false);
        document.addEventListener('keydown', onFormEvent, false);
    }

    // Worker Scripts
    if(typeof module === 'object') {
        module.exports.renderKeySpaceSearchWindow = renderKeySpaceSearchWindow;
    }

    var TEMPLATE_URL = 'keyspace/search/render/ks-search-window.html';

    function renderKeySpaceSearchWindow(responseString, e, callback) {
        var match = /^keyspace\.search\.results([\s\S]+)$/im.exec(responseString);
        if (!match)
            throw new Error("Invalid KeySpace Search Results: " + responseString);

        var results = match[1].split("\n");
        var stats = results.shift();

        var html_search_results = '';
        for(var i=0; i<results.length; i++) {
            var resultSplit = results[i].split(';'); // Search Results are ; delimited
            var pgp_id_public = resultSplit[0];
            var user_id = resultSplit[1];
            html_search_results +=
                "\n<div class='ks-search-entry' data-id='" + pgp_id_public + "'>" +
                    user_id +
                "</div>";
                //.replace(/{/g, '&#123;');

        }

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText
            .replace(/{\$html_search_results}/g, html_search_results)
                //.replace(/{\$url}/gi, url)
        );
    }


    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'ks-search-form':
                //search.log(e);
                if(e.type === 'submit')
                    submitSearchForm(e, formElm);
                if(e.type.substr(0, 3) === 'key')
                    handleFormKeyEvent(e, formElm);
                return true;

            default:
                return false;
        }
    }

    var history = [];
    var historyPos = 0;
    function handleFormKeyEvent(e, formElm) {
        var messageElm = formElm.querySelector('*[name=message], input[type=text], textarea');
        switch(e.which) {
            case 38: // UP
                messageElm.value = nextHistory(-1);
                break;

            case 40: // Down
                messageElm.value = nextHistory(1);
                break;
        }

        function nextHistory(inc) {
            historyPos += inc;
            if(historyPos > history.length-1)
                historyPos = 0;
            else if (historyPos < 0)
                historyPos = history.length-1;
            return history[historyPos];
        }
    }


    function submitSearchForm(e, formElm) {
        e.preventDefault();
        formElm = formElm || e.target.form || e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);

        var messageElm = formElm.querySelector('*[name=message], input[type=text], textarea');
        if(!messageElm)
            throw new Error("No message field found");

        if(!messageElm.value)
            return false;

        var commandString = "KEYSPACE.SEARCH " + messageElm.value;
        if(messageElm.value[0] === '/')
            commandString = messageElm.value.substr(1);

        var commandEvent = new CustomEvent('command', {
            detail: commandString,
            cancelable:true,
            bubbles:true
        });
        formElm.dispatchEvent(commandEvent);
        if(!commandEvent.defaultPrevented)
            throw new Error("Command event not handled");
        history.push(messageElm.value);
        messageElm.value = '';
        return false;
    }
})();

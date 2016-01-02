/**
 * Created by ari on 7/2/2015.
 */


(function() {

    // Client Script
    if(typeof document === 'object')  {
        document.addEventListener('submit', onFormEvent, false);
        //document.addEventListener('keydown', onFormEvent, false);
    }

    // Worker Scripts
    if(typeof module === 'object') {
        module.exports.renderKeySpaceSearchWindow = renderKeySpaceSearchWindow;
    }

    var TEMPLATE_URL = 'keyspace/search/render/ks-search-window.html';
    var TEMPLATE_SEARCH_ENTRY =
        "\n<tr>" +
            "\n\t<td>{$user_id}</td>" +
            "\n\t<td>" +
                "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"KEYSPACE.INFO {$pgp_id_public}\")'>{$pgp_id_public}</a>" +
            "\n\t</td>" +
            "\n\t<td>" +
                "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"MESSAGE {$pgp_id_public}\")'>Message</a>" +
                "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"MESSAGE {$pgp_id_public} !get public/id\")'>Add</a>" +
                // "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"KEYSPACE.INFO {$pgp_id_public}\")'>Profile</a>" +
            "\n\t</td>" +
        "\n</tr>";

    function getSearchPlaceholder() {
        var placeholders = [
            'i.e. Johanna Mockel',
            'i.e. Carl Schurz',
            'i.e. Charles Dickens',
            'i.e. Karl Marx',
            'i.e. Ralph Wiggum',
            'i.e. My PGP User ID',
            'i.e. first.last@yourmail',
            'i.e. johanna.m@gmail.com',
            'i.e. carl.c.s@gmail.com',
            'i.e. charles.dickens@gmail.com',
            'i.e. karl.h.marx@gmail.com',
            'i.e. ralph.wiggum@gmail.com'
        ];
        return placeholders[Math.floor(Math.random()*placeholders.length)];
    }

    function renderKeySpaceSearchWindow(responseString, e, lastSearch, callback) {
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
            var html_options = '';
            html_search_results += TEMPLATE_SEARCH_ENTRY
                .replace(/{\$user_id}/g, user_id)
                .replace(/{\$pgp_id_public}/g, pgp_id_public);

        }

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText
                .replace(/{\$html_search_results}/g, html_search_results)
                .replace(/{\$search}/g, lastSearch)
                .replace(/{\$placeholder}/g, getSearchPlaceholder)
                //.replace(/{\$url}/gi, url)$search
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
                return true;

            default:
                return false;
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
        //messageElm.value = '';
        return false;
    }
})();

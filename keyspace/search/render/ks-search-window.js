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
        module.exports.renderKeySpaceSearchWindowResults = renderKeySpaceSearchWindowResults;
    }


    var MAX_RESULTS = 30; // TODO: next page
    var TEMPLATE_URL = 'keyspace/search/render/ks-search-window.html';

    var TEMPLATE_SEARCH_RESULTS =
        "<section class='ks-search-results:'>" +
            "<table style='width: 100%'>" +
                "<thead>" +
                    "<tr>" +
                        "<th>Identity Name</th>" +
                        "<th style='width:1px'>Key ID</th>" +
                        "<th>Options</th>" +
                    "</tr>" +
                "</thead>" +
                "<tbody>" +
                    "{$html_search_results}" +
                "</tbody>" +
                "<tfoot>" +
                    "<tr>" +
                        "<th class='info'>" +
                        "    Channels Searched: {$stat_channel_count}" +
                        "</th>" +
                        "<th class='info'>" +
                        "    Active Clients: {$stat_client_count}" +
                        "</th>" +
                        "<th class='info'>" +
                        "    Contacts Found: {$stat_keyspace_count}" +
                        "</th>" +
                    "</tr>" +
                "</tfoot>" +
            "</table>" +
        "</section>";

    var TEMPLATE_SEARCH_ENTRY =
        "\n<tr>" +
            "\n\t<td>{$user_id}</td>" +
            "\n\t<td>" +
                "\n\t\t<a class='search-entry-command' href='KEYSPACE.INFO {$pgp_id_public}'>{$pgp_id_public}</a>" +
            "\n\t</td>" +
            "\n\t<td>" +
                "\n\t\t<a class='search-entry-command' href='#GET http://{$pgp_id_public}.ks/public/id' onclick='this.classList.add(\"subscribed\"'>Add</a>" +
                "\n\t\t<a class='search-entry-command' href='#MESSAGE {$pgp_id_public}'>Message</a>" +
                // "\n\t\t<a class='search-entry-command' onclick='Client.execute(\"KEYSPACE.INFO {$pgp_id_public}\")'>Profile</a>" +
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

    //var searchFilter = null;
    function renderKeySpaceSearchWindow(activeSuggestions, suggestionStats, lastSearch, callback) {

        renderKeySpaceSearchWindowResults(activeSuggestions, suggestionStats, lastSearch,
            function(html_search_results) {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", TEMPLATE_URL, false);
                xhr.send();
                if(xhr.status !== 200)
                    throw new Error("Error: " + xhr.responseText);
                callback(xhr.responseText
                        .replace(/{\$html_search_results}/g, html_search_results)
                        .replace(/{\$search}/g, lastSearch || '')
                        .replace(/{\$placeholder}/g, getSearchPlaceholder())
                    //.replace(/{\$url}/gi, url)$search
                );
            }
        );
    }

    function renderKeySpaceSearchWindowResults(activeSuggestions, suggestionStats, lastSearch, callback) {
        var stat_channel_count = suggestionStats[0];
        var stat_client_count = suggestionStats[1];
        var stat_keyspace_count = suggestionStats[2];

        var subscribedKeyspaces = [];

        self.module = {exports: {}};
        importScripts('client/subscriptions/client-subscriptions.js');
        var ClientSubscriptions = self.module.exports.ClientSubscriptions;

        // List all subscribed keyspaces
        ClientSubscriptions.searchKeySpaceSubscriptions(null, null,
            function(pgp_id_public, mode, argString) {
                if(subscribedKeyspaces.indexOf(pgp_id_public.toLowerCase()) === -1)
                    subscribedKeyspaces.push(pgp_id_public.toLowerCase());
            });

        var count = 0;
        var html_search_results = '';
        for(var i=0; i<activeSuggestions.length; i++) {
            var resultSplit = activeSuggestions[i].split(';'); // Search Results are ; delimited
            var pgp_id_public = resultSplit[0];
            var user_id = resultSplit[1];

            // Skip subscribed channels
            if(subscribedKeyspaces.indexOf(pgp_id_public.toLowerCase()) >= 0)
                continue;

            // Search Filter
            if(lastSearch
                && user_id.toLowerCase().indexOf(lastSearch) === -1
                && pgp_id_public.toLowerCase().indexOf(lastSearch) === -1)
                continue;

            html_search_results += TEMPLATE_SEARCH_ENTRY
                .replace(/{\$user_id}/g, user_id)
                .replace(/{\$pgp_id_public}/g, pgp_id_public);

            if(count++ >= MAX_RESULTS)
                break;
        }

        callback(TEMPLATE_SEARCH_RESULTS
                .replace(/{\$html_search_results}/g, html_search_results)
                .replace(/{\$stat_keyspace_count}/g, stat_keyspace_count)
                .replace(/{\$stat_client_count}/g, stat_client_count)
                .replace(/{\$stat_channel_count}/g, stat_channel_count)
                .replace(/{\$search}/g, lastSearch || '')
                .replace(/{\$placeholder}/g, getSearchPlaceholder())
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

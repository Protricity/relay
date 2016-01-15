/**
 * Created by ari on 7/2/2015.
 */


(function() {

    // Client Script
    if(typeof document === 'object')  {
        document.addEventListener('submit', onFormEvent, false);
        document.addEventListener('keyup', onFormEvent, false);
    }

    // Worker Scripts
    if(typeof module === 'object') {
        module.exports.renderChannelSearchWindow = renderChannelSearchWindow;
        module.exports.renderChannelSearchWindowResults = renderChannelSearchWindowResults;
    }

    var MAX_RESULTS = 30; // TODO: next page
    var TEMPLATE_URL = 'channel/search/render/channel-search-window.html';
    var TEMPLATE_SEARCH_ENTRY =
        "\n<tr>" +
            "\n\t<td>" +
                "\n\t\t<a class='search-entry-command' href1='javascript:Client.execute(\"CHANNEL.INFO {$channel}\")'>{$channel}</a>" +
            "\n\t</td>" +
            //"\n\t<td>{$channel_info}</td>" +
            "\n\t<td>" +
            "\n\t\t<a class='search-entry-command' onclick='Client.execute(\"CHANNEL.SUBSCRIBE.EVENT {$channel}\"); this.classList.add(\"subscribed\");'>Subscribe</a>" +
            "\n\t\t<a class='search-entry-command' onclick='Client.execute(\"CHANNEL.CHAT {$channel}\");  this.classList.add(\"subscribed\");'>Chat</a>" +
                // "\n\t\t<a class='search-entry-command' onclick='Client.execute(\"GET http://{$channel}.ks/public/id\")'>JOIN</a>" +
                // "\n\t\t<a class='search-entry-command' onclick='Client.execute(\"CHANNEL.INFO {$channel}\")'>Profile</a>" +
            "\n\t</td>" +
        "\n</tr>";

    var TEMPLATE_SEARCH_RESULTS =
        "<section class='channel-search-results:'>" +
            "<table style='width: 100%'>" +
                "<thead>" +
                    "<tr>" +
                        "<th style='width:50%'>Channels Found ({$stat_channel_count})</th>" +
                        "<th>Options</th>" +
                    "</tr>" +
                "</thead>" +
                "<tbody>" +
                    "{$html_search_results}" +
                "</tbody>" +
                "<tfoot>" +
                    "<tr>" +
                        "<th class='info'>" +
                        "    Contacts Searched: {$stat_keyspace_count}" +
                        "</th>" +
                        "<th class='info'>" +
                        "    Active Clients: {$stat_client_count}" +
                        "</th>" +
                    "</tr>" +
                "</tfoot>" +
            "</table>" +
        "</section>";

    function getSearchPlaceholder() {
        var placeholders = [
            'i.e. /country/us',
            'i.e. /region/or',
            'i.e. /city/portsmouth',
            'i.e. /town/springfield',
            'i.e. /zipcode/80085',
            'i.e. /timezone/america/phoenix'
        ];
        return placeholders[Math.floor(Math.random()*placeholders.length)];
    }

    //var searchFilter = null;
    function renderChannelSearchWindow(activeSuggestions, suggestionStats, lastSearch, callback) {

        renderChannelSearchWindowResults(activeSuggestions, suggestionStats, lastSearch,
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

    function renderChannelSearchWindowResults(activeSuggestions, suggestionStats, lastSearch, callback) {
        var stat_keyspace_count = suggestionStats[0];
        var stat_client_count = suggestionStats[1];
        var stat_channel_count = suggestionStats[2];

        self.module = {exports: {}};
        importScripts('client/subscriptions/client-subscriptions.js');
        var ClientSubscriptions = self.module.exports.ClientSubscriptions;

        // List all subscribed channels
        var subscribedChannels = [];
        ClientSubscriptions.searchChannelSubscriptions(null, null,
            function(channelName, mode, argString) {
                if(subscribedChannels.indexOf(channelName.toLowerCase()) === -1)
                    subscribedChannels.push(channelName.toLowerCase());
            });

        var html_search_results = '';
        var count = 0;
        for(var i=0; i<activeSuggestions.length; i++) {
            var resultSplit = activeSuggestions[i].split(';'); // Search Results are ; delimited
            var channelName = resultSplit[0];
            var channelInfo = resultSplit[1];

            // Skip subscribed channels
            if(subscribedChannels.indexOf(channelName.toLowerCase()) >= 0)
                continue;

            // Search Filter
            if(lastSearch
                && channelName.toLowerCase().indexOf(lastSearch) === -1)
                continue;

            //var html_options = '';
            html_search_results += TEMPLATE_SEARCH_ENTRY
                .replace(/{\$channel}/g, channelName)
                .replace(/{\$channel_info}/g, channelInfo);
                
            if(count++ >= MAX_RESULTS)
                break;
        }

        callback(TEMPLATE_SEARCH_RESULTS
                .replace(/{\$html_search_results}/g, html_search_results)
                .replace(/{\$stat_keyspace_count}/g, stat_keyspace_count)
                .replace(/{\$stat_client_count}/g, stat_client_count)
                .replace(/{\$stat_channel_count}/g, stat_channel_count)
                .replace(/{\$search}/g, lastSearch || '')
                .replace(/{\$placeholder}/g, getSearchPlaceholder)
            //.replace(/{\$url}/gi, url)$search
        );
    }


    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'channel-search-form':
                if(e.type === 'submit')
                    e.preventDefault();
                //if(e.type === 'submit')
                submitSearchForm(e, formElm);
                return true;

            default:
                return false;
        }
    }

    var lastCommand = null;
    var searchTimeout = null;
    function submitSearchForm(e, formElm) {
        formElm = formElm || e.target.form || e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            throw new Error("Invalid Form: " + formElm);

        var messageElm = formElm.querySelector('*[name=message], input[type=text], textarea');
        if(!messageElm)
            throw new Error("No message field found");

        if(!messageElm.value)
            return false;

        var commandString = "CHANNEL.SEARCH " + messageElm.value;
        //searchFilter = messageElm.value.toLowerCase();

        if(lastCommand === commandString)
            return false;
        lastCommand = commandString;

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
            //console.log("Searching...", commandString);
            var commandEvent = new CustomEvent('command', {
                detail: commandString,
                cancelable:true,
                bubbles:true
            });
            formElm.dispatchEvent(commandEvent);
            if(!commandEvent.defaultPrevented)
                throw new Error("Command event not handled");
            //messageElm.value = '';
        }, 300);

    }
})();

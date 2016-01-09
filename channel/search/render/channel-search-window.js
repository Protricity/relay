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
        module.exports.renderChannelSearchWindow = renderChannelSearchWindow;
    }

    var TEMPLATE_URL = 'channel/search/render/channel-search-window.html';
    var TEMPLATE_SEARCH_ENTRY =
        "\n<tr>" +
            "\n\t<td>" +
                "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"CHANNEL.SUBSCRIBE.EVENT {$channel}\")'>{$channel}</a>" +
            "\n\t</td>" +
            //"\n\t<td>{$channel_info}</td>" +
            "\n\t<td>" +
            "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"CHANNEL.SUBSCRIBE.EVENT {$channel}\")'>Subscribe</a>" +
            "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"CHANNEL.CHAT {$channel}\")'>Chat</a>" +
                // "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"GET http://{$channel}.ks/public/id\")'>JOIN</a>" +
                // "\n\t\t<a class='search-entry-command' href='javascript:Client.execute(\"CHANNEL.INFO {$channel}\")'>Profile</a>" +
            "\n\t</td>" +
        "\n</tr>";

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

    function renderChannelSearchWindow(activeSuggestions, lastSearch, callback) {

        var html_search_results = '';
        for(var i=0; i<activeSuggestions.length; i++) {
            var resultSplit = activeSuggestions[i].split(';'); // Search Results are ; delimited
            var channelName = resultSplit[0];
            var channelInfo = resultSplit[1];
            //var html_options = '';
            html_search_results += TEMPLATE_SEARCH_ENTRY
                .replace(/{\$channel}/g, channelName)
                .replace(/{\$channel_info}/g, channelInfo);

        }

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText
                .replace(/{\$html_search_results}/g, html_search_results)
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

        var commandString = "CHANNEL.SEARCH " + messageElm.value;
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

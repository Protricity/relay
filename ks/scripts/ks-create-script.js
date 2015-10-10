/**
 * Created by ari on 10/8/2015.
 */


if(!exports) var exports = {};
(function() {


    // Argument Steps. One step per argument
    var argStep = [
        "<input type='text' name='title' placeholder='Add a title' />",
        "<input type='text' name='tags' placeholder='Add tags' />"
    ];

    var ARG_STEP_TEMPLATE = "\
        <article class='channel put-script:'>\n\
            <script src='ks/listeners/ks-put-script-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <header class='title-bar'>\n\
                <strong>Create An Article</strong><span>:</span>\
                <a class='title-bar-minimize' href='#MINIMIZE put-script:'>[-]</a><!--\n\
             --><a class='title-bar-maximize' href='#MAXIMIZE put-script:'>[+]</a><!--\n\
             --><a class='title-bar-close' href='#CLOSE put-script:'>[x]</a>\n\
            </header>\
            <form action='#' name='ks-put-script-form'>\n\
                {$html_input}\
                <input type='hidden' name='command_string' value='{$command_string}' />\n\
            </form>\n\
            <footer>\n\
                {$html_preview}\n\
            </footer>\n\
        </article>";

    // Exports

    exports.runScript = function(commandString, callback) {
        var match = /^put\.template\s*([\s\S]*)$/im.exec(commandString);
        if(!match)
            return false;

        var args = match[2] ? match[2].split(/\s+/) : [];

        var url = match[1];
        match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(url);
        if(!match)
            throw new Error("Invalid URI: " + url);

        var scheme = match[2],
            host = match[4],
            contentPath = match[5].toLowerCase() || '',
            queryString = match[6] || '';

        var values = {};
        var queryStringPairs = queryString.split(/^\?|&/g);
        for(var i=0; i<queryStringPairs.length; i++) {
            var splitPair = queryStringPairs[i].split('=', 2);
            if(splitPair[0])
                values[decodeURIComponent(splitPair[0])] = decodeURIComponent(splitPair[1]) || true;
        }

        var HTML_PREVIEW = "\n\
            <hr><strong>Preview</strong>:</br>\n\
            <article>\n\
                <header>{$title}</header>\n\
            </article>"
            .replace(/{\$title}/ig, values.title || 'Article Title');

        if(typeof values.title === 'undefined') {
            var HTML_INPUT_TITLE = "\
                Add a title for this article or hit Next to skip:</br>\n\
                <input type='text' name='title' placeholder='Add a title' />\n\
                <input type='submit' value='Next'/>";

            callback(ARG_STEP_TEMPLATE
                .replace(/{\$html_input}/i, HTML_INPUT_TITLE)
                .replace(/{\$html_preview}/i, HTML_PREVIEW)
                .replace(/{\$command_string}/ig, commandString)
            );
            return true;
        }

        if(typeof values.tags === 'undefined') {
            var HTML_INPUT_TAGS = "\
                Add search tags for this article or hit Next to skip:</br>\n\
                <input type='text' name='tags' placeholder='[ex. search, tags, comma, delimited]' />\n\
                <input type='submit' value='Next'/>";

            callback(ARG_STEP_TEMPLATE
                .replace(/{\$html_input}/i, HTML_INPUT_TAGS)
                .replace(/{\$html_preview}/i, HTML_PREVIEW)
                .replace(/{\$command_string}/ig, commandString)
            );
            return true;
        }

        return true;
    };


})();
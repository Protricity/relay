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

    exports.runScript = function(fieldValues, callback) {

        var HTML_TEMPLATE =
            "\n<article>" +
                "\n\t<header>" + (fieldValues.title || 'Article Title') + "</header>" +
            "\n</article>";

        var HTML_PREVIEW = "\n\
            <hr><strong>Preview</strong>:</br>\n\
            " + HTML_TEMPLATE + "\n\
            <hr><strong>Code</strong>:</br>\n\
            <pre>" + HTML_TEMPLATE.replace(/</g, '&lt;') + "</pre>";


        // Ask for article Title
        if(typeof fieldValues.title === 'undefined') {
            var HTML_INPUT_TITLE = "\
                Add a title for this article or hit Next to skip:</br>\n\
                <input type='text' name='title' placeholder='Add a title' />\n\
                <input type='submit' value='Next'/>";

            callback(ARG_STEP_TEMPLATE
                .replace(/{\$html_input}/i, HTML_INPUT_TITLE)
                .replace(/{\$html_preview}/i, HTML_PREVIEW)
            );
            return true;
        }

        // Ask for Tags
        if(typeof fieldValues.tags === 'undefined') {
            var HTML_INPUT_TAGS = "\
                Add search tags for this article or hit Next to skip:</br>\n\
                <input type='text' name='tags' placeholder='[ex. search, tags, comma, delimited]' />\n\
                <input type='submit' value='Next'/>";

            callback(ARG_STEP_TEMPLATE
                .replace(/{\$html_input}/i, HTML_INPUT_TAGS)
                .replace(/{\$html_preview}/i, HTML_PREVIEW)
            );
            return true;
        }

        return true;
    };


})();
/**
 * Created by ari on 10/8/2015.
 */


if(!exports) var exports = {};
(function() {

    // Exports

    exports.runScript = function(fieldValues, callback) {

        var ARG_STEP_TEMPLATE = "\
        <article class='channel put: maximized'>\n\
            <script src='ks/listeners/ks-put-script-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <header class='header-bar'>\n\
                <strong>Create An Article</strong><span>:</span>\
            </header>\n\
            <div class='header-bar-buttons'>\n\
                <a href='#MINIMIZE put:'>[-]</a><!--\n\
             --><a href='#MAXIMIZE put:'>[+]</a><!--\n\
             --><a href='#CLOSE put:'>[x]</a>\n\
            </div>\n\
            <section>\n\
                <form action='ks/scripts/ks-create-script.js' name='ks-put-script-form'>\n\
                    {$html_input}\
                </form>\n\
            </section>\n\
            <section>\n\
                {$html_preview}\n\
            </section>\n\
            <footer class='footer-bar'>&nbsp;</footer>\n\
        </article>";
//                <input type='hidden' name='command_string' value='{$command_string}' />\n\

        var HTML_TEMPLATE =
            "\n<article data-tags='" + (fieldValues.tags || '') + "'>" +
                "\n\t<header>" + (fieldValues.title || 'Article Title') + "</header>" +
            "\n</article>";

        var HTML_PREVIEW = "\n\
            <div class='put-preview-template' style='display: none;'>" + encodeURIComponent(HTML_TEMPLATE) + "</div>\n\
            <br/><strong>Preview</strong>:</br>\n\
            <div class='put-preview-output'>" + HTML_TEMPLATE + "</div>\n\
            <br/><strong>Code</strong>:\n\
            <pre class='put-preview-source'>" + HTML_TEMPLATE.replace(/</g, '&lt;') + "</pre>";


        // Ask for article Title
        if(typeof fieldValues.title === 'undefined') {
            var HTML_INPUT_TITLE = "\
                Add a title for this article:</br>\n\
                <input type='text' name='title' placeholder='Article Title' />\n\
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
                Add search tags for this article:</br>\n\
                <input type='text' name='tags' placeholder='[ex. search, tags, comma, delimited]' />\n\
                <input type='submit' value='Next'/>";

            callback(ARG_STEP_TEMPLATE
                .replace(/{\$html_input}/i, HTML_INPUT_TAGS)
                .replace(/{\$html_preview}/i, HTML_PREVIEW)
            );
            return true;
        }

        // TODO status_content

        importScripts('ks/templates/ks-put-template.js');
        Templates.ks.put.form(HTML_TEMPLATE, callback);
        // Free up template resources
        delete Templates.ks.put.form;

        return true;
    };


})();
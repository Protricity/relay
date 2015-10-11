/**
 * Created by ari on 10/8/2015.
 */


if(!exports) var exports = {};
(function() {

    // Exports

    exports.runScript = function(fieldValues, callback) {

        var forms = {
            '#default': "<i>Add a {$field_name} for this article:</i></br>\n\
                <input type='text' name='{$field_name}' placeholder='Your Article {$field_name}' />\n\
                <input type='submit' value='Next'/>",

            title: "<i>Add a title for this article:</i></br>\n\
                <input type='text' name='{$field_name}' placeholder='Your Article Title' />\n\
                <input type='submit' value='Next'/>",

            tags: "<i>Add search tags for this article:</i></br>\n\
                <input type='text' name='{$field_name}' placeholder='[ex. search, tags, comma, delimited]' />\n\
                <input type='submit' value='Next'/>"
        };



        var ARG_STEP_TEMPLATE = "\
        <article class='channel put: maximized'>\n\
            <script src='ks/listeners/ks-put-script-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <header class='header-bar'>\n\
                <a href='#MAXIMIZE put:'>Simple Article Wizard</a>\
            </header>\n\
            <div class='header-bar-buttons'>\n\
                <a href='#MINIMIZE put:'>[-]</a><!--\n\
             --><a href='#MAXIMIZE put:'>[+]</a><!--\n\
             --><a href='#CLOSE put:'>[x]</a>\n\
            </div>\n\
                {$html_steps}\n\
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

        if(!fieldValues.datetime)
            fieldValues.datetime = Date.now();

        var HTML_TEMPLATE =
            "\n<article data-tags='{$tags}'>" +
                "\n\t<header>{$title}</header>" +
                "\n\t<time datetime='{$datetime}'>{$time}</time>" +
                "\n\t<main>{$main}</main>" +
                "\n\t<details>{$details}</details>" +
                "\n\t<footer>{$footer}</footer>" +
            "\n</article>";

        var formattedPreview = HTML_TEMPLATE;

        var selectedField = null;
        var requiredFields = [];
        var html_steps = '';
        var stepCount = 0;
        var formattedTemplate = HTML_TEMPLATE;
        var fieldTags = null;
        while(fieldTags = /{\$([^}]+)}/g.exec(formattedTemplate)) {
            var tagName = fieldTags[1];
            var tagValue = ''; // "[ No " + tagName + " ]";
            if(typeof fieldValues[tagName] === 'undefined') {
                if(!selectedField)
                    selectedField = tagName;
                requiredFields.push(tagName);

            } else {
                tagValue = fieldValues[tagName];
                formattedPreview = formattedPreview.replace('{$' + tagName + '}', tagValue);
            }
            formattedTemplate = formattedTemplate.replace('{$' + tagName + '}', tagValue);
            html_steps += "<button " + (selectedField === tagName ? "style='border-style: inset;'" : '') + ">" + ++stepCount + ". " + tagName + "</button>";
        }
        formattedTemplate = formattedTemplate.replace(/<[^\/>][^>]*><\/[^>]+>/g, ''); // Empty tags
        formattedPreview = formattedPreview
            .replace(/</g, '&lt;')
            .replace(/\$/g, '&#36;');

        var html_preview = ARG_STEP_TEMPLATE
            .replace(/{\$html_preview}/i, "\n\
                <strong>Preview</strong>:</br>\n\
                <div class='put-preview-output'>" + formattedTemplate + "</div>\n\
                <br/><strong>Code</strong>:\n\
                <pre class='put-preview-source'>" + formattedPreview + "</pre>")
            .replace(/{\$html_steps}/i, html_steps);

        if(selectedField) {
            var form = (forms[selectedField] || forms['#default']) + '';
            callback(html_preview
                .replace(/{\$html_input}/i, form
                    .replace(/{\$field_name}/ig, selectedField)
                )
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
/**
 * Created by ari on 10/8/2015.
 */


if(!exports) var exports = {};
(function() {

    // Exports

    exports.runScript = function(fieldValues, callback) {

        var forms = {
            '#default': "<i>Add a {$field_title} for this article:</i></br>\n\
                <input type='text' name='{$field_name}' placeholder='Your Article {$field_title}' />\n\
                <input type='submit' value='Next'/>",

            title: "<i>Add a title for this article:</i></br>\n\
                <input type='text' name='{$field_name}' size='36' placeholder='Your Article Title' />\n\
                <input type='submit' value='Next'/>",

            tags: "<i>Add search tags for this article:</i></br>\n\
                <input type='text' name='{$field_name}' size='48' placeholder='[ex. search, tags, comma, delimited]' />\n\
                <input type='submit' value='Next'/>"
        };

        var formSteps = [
            ['title', 'Title'],
            ['time', 'Date/Time', function(tagName, tagValue, html) {
                return html
                    .replace(/{\$datetime}/g, Date.now())
                    .replace(/{\$time}/g, tagValue);
            }],
            ['main', 'Content'],
            ['details', 'Details'],
            ['tags', 'Search Tags'],
            ['footer', 'Footer']
        ];

        var HTML_TEMPLATE =
            "\n<article data-tags='{$tags}'>" +
            "\n\t<header>{$title}</header>" +
            "\n\t<time datetime='{$datetime}'>{$time}</time>" +
            "\n\t<main>{$main}</main>" +
            "\n\t<details>{$details}</details>" +
            "\n\t<footer>{$footer}</footer>" +
            "\n</article>";


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

        var formattedPreview = HTML_TEMPLATE;
        var formattedTemplate = HTML_TEMPLATE;
        var requiredFields = [];
        var html_steps = '';
        var selectedStep = 0;
        var stepCount = 0;

        for(var i=0; i<formSteps.length; i++) {
            var tagName = formSteps[i][0];
            var tagTitle = formSteps[i][1];
            var tagCall = formSteps[i][2] || function(tagName, tagValue, html) {
                return html.replace('{$' + tagName + '}', tagValue);
            };

            if(typeof fieldValues[tagName] === 'undefined') {
                requiredFields.push(tagName);
                formattedPreview = tagCall(tagName, '{&#36;' + tagName + '}', formattedPreview) || formattedPreview;
                formattedTemplate = tagCall(tagName, '', formattedTemplate) || formattedTemplate;

            } else {
                var tagValue = fieldValues[tagName];
                formattedPreview = tagCall(tagName, tagValue, formattedPreview) || formattedPreview;
                formattedTemplate = tagCall(tagName, tagValue, formattedTemplate) || formattedTemplate;
            }
            html_steps += "<button " + (selectedStep === i ? "style='border-style: inset;'" : '') + ">" + ++stepCount + ". " + tagTitle + "</button>";
        }

        // Remove Empty tags
        formattedTemplate = formattedTemplate.replace(/<[^\/>][^>]*><\/[^>]+>\n*/g, '');

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

        if(requiredFields.length > 0) {
            var form = (forms[selectedStep] || forms['#default']) + '';
            var stepTagName = formSteps[selectedStep][0];
            var stepTagTitle = formSteps[selectedStep][1];
            var final_html = html_preview
                .replace(/{\$html_input}/i, form
                    .replace(/{\$field_name}/ig, stepTagName)
                    .replace(/{\$field_title}/ig, stepTagTitle)
                );
            callback(final_html);
            return true;
        }

        // TODO status_content
        importScripts('ks/templates/ks-put-template.js');
        Templates.ks.put.form(formattedTemplate, callback);
        // Free up template resources
        delete Templates.ks.put.form;

        return true;
    };


})();
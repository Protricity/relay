/**
 * Created by ari on 10/10/2015.
 */

if(!exports) var exports = {};
exports.TabbedFormBuilder = TabbedFormBuilder;

var DEFAULT_FORM_HTML = "<i>Add a {$field_title} for this article:</i></br>\n\
    <input type='text' name='{$field_name}' placeholder='Your Article {$field_title}' />\n\
    <input type='submit' value='Next'/>";

var TABBED_FORM_TEMPLATE = "\
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
            <strong>Preview</strong>:</br>\n\
            <div class='put-preview-output'>{$html_output}</div>\n\
            <br/><strong>Code</strong>:\n\
            <pre class='put-preview-source'>{$html_source}</pre>\n\
        </section>\n\
        <footer class='footer-bar'>&nbsp;</footer>\n\
    </article>";
//                <input type='hidden' name='command_string' value='{$command_string}' />\n\


function TabbedFormBuilder(html_template_original) {
    var formSteps = [];
    this.addFormStep = function(tagName, tagTitle, formHTML, tagCallback) {
        formSteps.push(Array.prototype.slice.call(arguments));
    };

    this.addFormTab = function(tabName, tabHTML, tabCallback) {

    };

    this.render = function(fieldValues, callback){

        var html_template_output = html_template_original || '';
        var requiredFields = [];
        var html_steps = '';
        var selectedStep = 0;
        var stepCount = 0;

        for(var i=0; i<formSteps.length; i++) {
            var tagName = formSteps[i][0];
            var tagTitle = formSteps[i][1];
            var tagFormHTML = formSteps[i][2];
            var tagCall = formSteps[i][3] || function(tagName, tagValue, html) {
                    return html.replace('{$' + tagName + '}', tagValue);
                };

            if(typeof fieldValues[tagName] === 'undefined') {
                requiredFields.push(tagName);
                //html_template = tagCall(tagName, '{&#36;' + tagName + '}', html_template) || html_template;

            } else {
                var tagValue = fieldValues[tagName];
                html_template_output = tagCall(tagName, tagValue, html_template_output) || html_template_output;
            }
            html_steps += "<button " + (selectedStep === i ? "style='border-style: inset;'" : '') + ">" + ++stepCount + ". " + tagTitle + "</button>";
        }


        var html_preview = TABBED_FORM_TEMPLATE
            .replace(/{\$html_output}/i, html_template_output
                .replace(/{\$[^}]+}/g, '')
                .replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '') // TODO: ugly hack to remove layered empty tags
                .replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, ''))
            .replace(/{\$html_source}/i, html_template_output
                .replace(/</g, '&lt;')
                .replace(/\$/g, '&#36;'))
            .replace(/{\$html_steps}/i, html_steps);

        var stepTagName = formSteps[selectedStep][0];
        var stepTagTitle = formSteps[selectedStep][1];
        var stepTagFormHTML = formSteps[selectedStep][2] || DEFAULT_FORM_HTML;
        var final_html = html_preview
            .replace(/{\$html_input}/i, stepTagFormHTML
                .replace(/{\$field_name}/ig, stepTagName)
                .replace(/{\$field_title}/ig, stepTagTitle)
        );
        callback(final_html, html_template_output);
    };
}

/**
 * Created by ari on 10/8/2015.
 */


if(!exports) var exports = {};
(function() {

    var HTML_TEMPLATE = "\
        <article>\n\
            <header>{$title}</header>\n\
            <time datetime='{$datetime}'>{$time}</time>\n\
            <main>{$content}</main>\n\
            <footer>{$footer}</footer>\n\
        </article>";

    var TABBED_FORM_TEMPLATE = "\
    <article class='channel put: maximized'>\n\
        <script src='ks/scripts/ks-create-script-listeners.js'></script>\n\
        <link rel='stylesheet' href='ks/scripts/ks-create-script.css' type='text/css'>\n\
        <style>\
            form[name=ks-create-script-form] .section-step { display: none; }\
            form[name=ks-create-script-form] input[name=radio-step]:checked + .button-step + .section-step { display: inherit; }\
        </style>\n\
        <header class='header-bar show-on-minimized'>\n\
            <a href='#MAXIMIZE put:'>Simple Article Wizard</a>\
        </header>\n\
        <div class='header-bar-buttons show-on-minimized'>\n\
            <a href='#MINIMIZE put:'>[-]</a><!--\n\
         --><a href='#MAXIMIZE put:'>[+]</a><!--\n\
         --><a href='#CLOSE put:'>[x]</a>\n\
        </div>\n\
        <form name='ks-create-script-form' action='#'>\n\
            \
            <input type='radio' id='radio-step-1' name='radio-step' checked>\n\
            <label for='radio-step-1' class='button-step'>Title</label>\n\
            <section class='section-step'>\n\
                <strong>Add a title for this article:</strong><br>\n\
                <input type='text' name='title' size='36' placeholder='Your Article Title'>\n\
                <input type='button' value='Add Content...' onclick='document.getElementById(\"radio-step-2\").checked=true' />\
            </section>\n\
            \
            <input type='radio' id='radio-step-2' name='radio-step'>\n\
            <label for='radio-step-2' class='button-step'>Content</label>\n\
            <section class='section-step'>\n\
                <strong>Add content for this article:</strong><br>\n\
                <textarea name='content' placeholder='Article Content'></textarea>\n\
                <input type='button' value='Add Date/Time...' onclick='document.getElementById(\"radio-step-3\").checked=true' />\
                <input type='submit' value='Finished' />\
            </section>\n\
            \
            <input type='radio' id='radio-step-3' name='radio-step'>\n\
            <label for='radio-step-3' class='button-step'>Time Stamp</label>\n\
            <section class='section-step'>\n\
                <strong>Add a <span class='timestamp'>Time Stamp</span> for this article:</strong><br>\n\
                <input type='date' name='date' />\n\
                <input type='button' value='Add Signature...' onclick='document.getElementById(\"radio-step-4\").checked=true' />\
                <input type='submit' value='Finished' />\
            </section>\n\
            \
            <input type='radio' id='radio-step-4' name='radio-step'>\n\
            <label for='radio-step-4' class='button-step'>Footer</label>\n\
            <section class='section-step'>\n\
                <strong>Add a signature to this article:</strong><br>\n\
                <textarea name='footer' placeholder='Article Signature/Footer'></textarea>\n\
                <input type='submit' value='Finished' />\
            </section>\n\
        </form>\n\
        <section>\n\
            <strong>Preview</strong>:</br>\n\
            <div class='put-preview-output'>[$html_output]</div>\n\
            <br/><strong>Code</strong>:\n\
            <pre class='put-preview-source'>[$html_source]</pre>\n\
        </section>\n\
        <footer class='footer-bar'>&nbsp;</footer>\n\
    </article>";
//                <input type='hidden' name='command_string' value='{$command_string}' />\n\


//\
//<section class='section-step section-step-2'>\n\
//<strong>Add content for this article:</strong><br>\n\
//<textarea name='content' placeholder='Article Content'></textarea>\n\
//<input type='submit' value='Add a TimeStamp...' onclick='this.form.setAttribute(\"class\", \"show-step-3\");'>\n\
//<input type='submit' value='Done'>\n\
//</section>\n\
//<section class='section-step section-step-3'>\n\
//<strong>Add a <span class='timestamp'>Time Stamp</span> for this article:</strong><br>\n\
//<input type='date' name='title' size='36' placeholder='TODO'>\n\
//<input type='submit' value='Add Details...' onclick='this.form.setAttribute(\"class\", \"show-step-3\");'>\n\
//<input type='submit' value='Done'>\n\
//</section>\n\
//<section class='section-step section-step-4'>\n\
//<strong>Add a title for this article:</strong><br>\n\
//<input type='text' name='title' size='36' placeholder='Your Article Title'>\n\
//<input type='submit' value='Add Tags' onclick='this.form.setAttribute(\"class\", \"show-step-2\");'>\n\
//<input type='submit' value='Done'>\n\
//</section>\n\
//<section class='section-step section-step-5'>\n\
//<strong>Add a title for this article:</strong><br>\n\
//<input type='text' name='title' size='36' placeholder='Your Article Title'>\n\
//<input type='submit' value='Add Tags' onclick='this.form.setAttribute(\"class\", \"show-step-2\");'>\n\
//<input type='submit' value='Done'>\n\
//</section>\n\
//<section class='section-step section-step-6'>\n\
//<strong>Add a title for this article:</strong><br>\n\
//<input type='text' name='title' size='36' placeholder='Your Article Title'>\n\
//<input type='submit' value='Done'>\n\
//</section>\n\
    exports.runScript = function(commandString, callback) {
        callback(TABBED_FORM_TEMPLATE);
        return true;
    };

    // Exports

    exports.runScript2 = function(fieldValues, callback) {
        if(typeof TabbedFormBuilder === 'undefined')
            importScripts('framework/form/tabbed-form-builder.js');


        var FORM_TITLE = "<strong>Add a title for this article:</strong></br>\n\
                <input type='text' name='{$field_name}' size='36' placeholder='Your Article Title' />\n\
                <input type='submit' value='Next'/>";

        var FORM_TAGS = "<strong>Add search tags for this article:</strong></br>\n\
                <input type='text' name='{$field_name}' size='48' placeholder='[ex. search, tags, comma, delimited]' />\n\
                <input type='submit' value='Next'/>";

        var builder = new TabbedFormBuilder(HTML_TEMPLATE);
        builder.addFormStep('title', 'Title', FORM_TITLE);
        builder.addFormStep('time', 'Date/Time', null, function(tagName, tagValue, html) {
            return html
                .replace(/{\$datetime}/g, Date.now())
                .replace(/{\$time}/g, tagValue);
        });
        builder.addFormStep('main', 'Content');
        builder.addFormStep('details', 'Details');
        builder.addFormStep('tags', 'Search Tags', FORM_TAGS);
        builder.addFormStep('footer', 'Footer');
        builder.render(fieldValues, function(form_html, html_template_output) {
            if(html_template_output.indexOf('$') === -1) {
                // Complete

                // Remove Empty tags
                html_template_output = html_template_output
                    //.replace(/\$/g, '&#36;')// TODO: hack to prevent rendering issues with $
                    .replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '') // TODO: ugly hack to remove layered empty tags
                    .replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '');

                // TODO status_content
                importScripts('ks/templates/ks-put-template.js');
                Templates.ks.put.form(html_template_output, callback);
                // Free up template resources
                delete Templates.ks.put.form;


            } else {
                // Incomplete
                callback(form_html);
            }
        });

        return true;
    };


})();
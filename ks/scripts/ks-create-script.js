/**
 * Created by ari on 10/8/2015.
 */


if(!exports) var exports = {};
(function() {

    var HTML_TEMPLATE = "\
        <article>\n\
            <header>{$title}</header>\n\
            <time datetime='{$datetime}'>{$time}</time>\n\
            <main>{$main}</main>\n\
            <details>{$details}\n\
                <tags>{$tags}</tags>\n\
            </details>\n\
            <footer>{$footer}</footer>\n\
        </article>";
    // Exports

    exports.runScript = function(fieldValues, callback) {
        if(typeof TabbedFormBuilder === 'undefined')
            importScripts('framework/form/tabbed-form-builder.js');


        var FORM_TITLE = "<i>Add a title for this article:</i></br>\n\
                <input type='text' name='{$field_name}' size='36' placeholder='Your Article Title' />\n\
                <input type='submit' value='Next'/>";

        var FORM_TAGS = "<i>Add search tags for this article:</i></br>\n\
                <input type='text' name='{$field_name}' size='48' placeholder='[ex. search, tags, comma, delimited]' />\n\
                <input type='submit' value='Next'/>"

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
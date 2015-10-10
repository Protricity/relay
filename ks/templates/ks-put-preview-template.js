/**
 * Created by ari on 6/19/2015.
 */


var Templates = Templates || {};
Templates.ks = Templates.ks || {};
Templates.ks.put = Templates.ks.put || {};

Templates.ks.put.preview = function(content, callback) {
// TODO: variables for topic, url, image etc

    var classes = [];

    var PUT_FORM_PREVIEW_TEMPLATE = "\
        <article class='channel put-preview: {$classes}'>\n\
            <script src='ks/listeners/ks-put-preview-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <header class='title-bar'>\n\
                <span class='command'>Preview</span><strong> Key Space</strong><span> content:</span>\
                <a class='title-bar-minimize' href='#MINIMIZE put-preview:'>[-]</a><!--\n\
             --><a class='title-bar-maximize' href='#MAXIMIZE put-preview:'>[+]</a><!--\n\
             --><a class='title-bar-close' href='#CLOSE put:'>[x]</a>\n\
            </header>\
            <section class='put-preview-content:' style='position:relative;'>{$content}</section>\n\
            <br/>\n\
            <form name='ks-put-preview-form' >\n\
                <fieldset>\n\
                    <legend>Drag and Drop Suggested Content</legend>\n\
                    <div class='put-preview-template-content:'>\n\
                        <header draggable='true'>Content Header</header>\n\
                        <a draggable='true' href='#sdf'>URL Hyperlink</a>\n\
                        <hr draggable='true' />\n\
                        <footer draggable='true'>Content Footer</footer>\n\
                    </div>\n\
                </fieldset>\n\
            </form>\n\
        </article>";

    var html_template_options = '';

    // Callback
    callback(PUT_FORM_PREVIEW_TEMPLATE
            .replace(/{\$classes}/gi, classes ? classes.join(' ') : '')
            .replace(/{\$content}/gi, content || '')
            .replace(/{\$html_template_options}/gi, html_template_options || '')
    );

    //<article class='channel put-preview: hide-on-compact'>\n\
    //    <header class='title-bar'>\n\
    //        <span class='command'>Preview</span><span class='html'> HTML</span>\
    //        <a class='title-bar-minimize' href='#MINIMIZE put-preview:'>[-]</a><!--\n\
    //     --><a class='title-bar-maximize' href='#MAXIMIZE put-preview:'>[+]</a>\n\
    //    </header>\
    //    <section class='put-preview-content:'></section>\
    //
    //<fieldset draggable='true'>\n\
    //    <legend>\
    //        <select name='template'>\n\
    //            <option value=''>Select a template...</option>\n\
    //            <option value='header'>Header</option>\n\
    //            <option value='footer'>Footer</option>\n\
    //                        {$html_template_options}\n\
    //        </select>\n\
    //    </legend>\n\
    //    <div class='put-preview-template-content:'>asd fsdfas</div>\n\
    //</fieldset>\n\
    //            <fieldset>\n\
    //                <legend>HTML Code</legend>\n\
    //                <code class='put-preview-template-code:'>adsf asd</code>\n\
    //            </fieldset>\n\
};

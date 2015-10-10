/**
 * Created by ari on 6/19/2015.
 */


var Templates = Templates || {};
Templates.ks = Templates.ks || {};
Templates.ks.put = Templates.ks.put || {};
Templates.ks.put.form = function(content, callback) {
    var PUT_FORM_TEMPLATE = "\
        <article class='channel put: compact'>\n\
            <script src='ks/listeners/ks-put-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <header class='title-bar'>\n\
                <span class='command'>Put</span><span> content in your </span> <strong>Key Space</strong>\
                <a class='title-bar-minimize' href='#MINIMIZE put:'>[-]</a><!--\n\
             --><a class='title-bar-maximize' href='#MAXIMIZE put:'>[+]</a><!--\n\
             --><a class='title-bar-close' href='#CLOSE put:'>[x]</a>\n\
            </header>\
            <form name='ks-put-form'>\n\
                <label class='label-content'>\
                    Create new <span class='html'>HTML</span> content for your <strong>Key Space</strong>:\n\
                    <br/><span class='info'>(You can also use a <a href='#PUT.TEMPLATE'>template</a>)</span>\
                    <br/><textarea cols='50' rows='8' class='focus' name='content' required='required' placeholder='Type anything you like.\n\n\t<code>html tags</code>\n\t<strong>allowed!</strong>'>{$content}</textarea>\n\
                </label><br/>\n\
                <label class='label-submit hide-on-compact'>\n\
                    <input type='submit' value='Publish' name='put' />\n\
                </label>\n\
                <label class='label-path hide-on-compact'>to\n\
                    <select name='path'>\n\
                        <option value='~'>My Home Page</option>\n\
                        <option disabled='disabled'>Friend's Web Space...</option>\n\
                        <option disabled='disabled'>Other Web Space...</option>\n\
                    </select>\n\
                </label>&nbsp;\n\
            </form>\n\
        </article>";
        //<article class='channel put-preview: hide-on-compact'>\n\
        //    <header class='title-bar'>\n\
        //        <span class='command'>Preview</span><span class='html'> HTML</span>\
        //        <a class='title-bar-minimize' href='#MINIMIZE put-preview:'>[-]</a><!--\n\
        //     --><a class='title-bar-maximize' href='#MAXIMIZE put-preview:'>[+]</a>\n\
        //    </header>\
        //    <section class='put-preview-content:'></section>\

    callback(PUT_FORM_TEMPLATE
            .replace(/{\$content}/gi, content || '')
        //        .replace(/{\$html_pgp_id_public}/gi, html_pgp_id_public_html || '')
        //.replace(/{\$form_class}/gi, form_classes.join(' '))
        //.replace(/{\$html_path_options}/gi, html_path_options || '')
        //.replace(/{\$attr_preview_checked}/gi, "checked='checked'") // TODO: get from config
    );
};
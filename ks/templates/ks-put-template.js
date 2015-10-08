/**
 * Created by ari on 6/19/2015.
 */


var Templates = Templates || {};
Templates.ks = Templates.ks || {};
Templates.ks.put = Templates.ks.put || {};
Templates.ks.put.form = function(content, callback) {
    var PUT_FORM_TEMPLATE = "\
        <article class='channel put:'>\n\
            <script src='ks/ks-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <header style='width: 100%;'>\n\
                <span class='command'>Put</span> content in your <strong>Key Space</strong>\
                <a class='command-minimize' href='#MINIMIZE put' style='float: right'>[-]</a><!--\n\
             --><a class='command-maximize' href='#MAXIMIZE put' style='float: right'>[+]</a><!--\n\
             --><a class='command-close' href='#CLOSE put' style='float: right'>[x]</a>\n\
            </header>\
            <form name='ks-put-form' class='compact' style='float:left;'>\n\
                <label class='label-content'>\
                    Create new <span class='html'>HTML</span> content for your <strong>Key Space</strong>:\n\
                    <br/><span class='info'>(You can also use a <a href='#PUT.TEMPLATE'>template</a>)</span>\
                    <br/><textarea cols='50' rows='8' class='focus' name='content' required='required' placeholder='Type anything you like.\n\n\t<i>most</i>\n\t<code>html tags</code>\n\t<strong>allowed!</strong>'>{$content}</textarea>\n\
                </label><br/>\n\
                <label class='label-submit hide-on-compact'>\n\
                    <input type='submit' value='Publish' name='put' />\n\
                </label>\n\
                <label class='label-path hide-on-compact'>to\n\
                    <select name='path' style='width:12em;'>\n\
                        <option value='~'>My Home Page</option>\n\
                        <option disabled='disabled'>Friend's Web Space...</option>\n\
                        <option disabled='disabled'>Other Web Space...</option>\n\
                    </select>\n\
                </label>&nbsp;\n\
                <label class='label-template hide-on-compact' >\n\
                    <input disabled='disabled' type='button' value='Preview >' name='preview' />\n\
                </label>\n\
            </form>\n\
        </article>";

    callback(PUT_FORM_TEMPLATE
            .replace(/{\$content}/gi, content || '')
        //        .replace(/{\$html_pgp_id_public}/gi, html_pgp_id_public_html || '')
        //.replace(/{\$form_class}/gi, form_classes.join(' '))
        //.replace(/{\$html_path_options}/gi, html_path_options || '')
        //.replace(/{\$attr_preview_checked}/gi, "checked='checked'") // TODO: get from config
    );
};

Templates.ks.put.template = function(commandString, callback) {
    importScripts()
    call(commandString)

};


    // " + EXAMPLE_VOTE + "\n\

    //<hr/><label class='label-pgp-id-private hide-on-compact'>Post with (PGP Identity):<br/>\n\
    //                <select name='pgp_id_public' required='required'>\n\
    //                    <option value=''>Select a PGP Identity</option>\n\
    //                    <optgroup class='pgp-identities' label='My PGP Identities'>\n\
    //                        {$html_pgp_id_public}\n\
    //                    </optgroup>\n\
    //                    <optgroup label='Other options'>\n\
    //                        <option value='' disabled='disabled'>Manage PGP Identities...</option>\n\
    //                        <option value='' disabled='disabled'>Look up Identity...</option>\n\
    //                    </optgroup>\n\
    //                </select>\n\
    //            <br/><br/></label>\n\
    //                <label class='label-passphrase hide-on-compact hide-on-no-passphrase-required'>PGP Passphrase (if required):<br/>\n\
    //                    <input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>\n\
    //                    <br/><br/></label>\n\

    //<label class='label-submit hide-on-compact'>\n\
    //    <input class='pressed' type='checkbox' name='preview' {$attr_preview_checked}/>Preview your post\n\
    //</label>\n\

    //var form_classes = [];
    //var html_pgp_id_public_html = '';
    //var html_path_options = '';

    // Query private key(s)
    //var path = '/public/id';
    //getKeySpaceDB().queryAll(path, function(err, content) {

        //if(err)
        //    throw new Error(err);

        //if(content) {
        //    html_pgp_id_public_html +=
        //        '<option value="' + content.pgp_id_public + '">' +
        //            content.user_id.replace(/</, '&lt;') +
        //        '</option>';

        //} else {
            // Callback
        //}

    //});

//<label class='label-recipients show-section-on-value'>Choose which subscribers may view this post:<br/>\n\
//    <select name='recipients'>\n\
//        <option value='*'>Everybody</option>\n\
//        <option disabled='disabled'>My friends</option>\n\
//        <option disabled='disabled'>Friends of Friends</option>\n\
//        <option disabled='disabled'>Specific Recipients</option>\n\
//    </select>\n\
//<br/><br/></label>\n\


Templates.ks.put.preview = function(content, callback) {
// TODO: variables for topic, url, image etc

    var PUT_FORM_PREVIEW_TEMPLATE = "\
        <article class='channel put-preview:'>\n\
            <script src='ks/ks-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <legend class='title'><span class='command'>Preview</span></legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE put:'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE put:'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE put:'>[x]</a>\n\
            </div>\n\
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
    var html_template_options = '';

    // Callback
    callback(PUT_FORM_PREVIEW_TEMPLATE
            .replace(/{\$content}/gi, content || '')
            .replace(/{\$html_template_options}/gi, html_template_options || '')
    );
};


function getKeySpaceDB() {
    if(typeof self.KeySpaceDB === 'undefined') {
        if(typeof importScripts === "function")
            importScripts('ks/ks-db.js');
        else
            self.KeySpaceDB = require('./ks-db.js').KeySpaceDB;
    }
    return self.KeySpaceDB;
}

var EXAMPLE_VOTE = "\
        <ul draggable='true' class='app.vote' data-id='abcd'>\n\
            <script src='app/vote/vote-listeners.js'></script>\n\
            <lh class='app.vote.title'>Vote 'abcd'</lh>\n\
            <li class='app.vote.option' data-option-id='abcd.1'>Option #1</li>\n\
            <li class='app.vote.option' data-option-id='abcd.2'>Option #2</li>\n\
            <li class='app.vote.option' data-option-id='abcd.3'>Option #3</li>\n\
        </ul>";

/**
 * Created by ari on 6/19/2015.
 */

var restHTTPBrowserTemplate = function(responseText, callback) {
    // Template
    var HTTP_BROWSER_TEMPLATE = "\
        <article class='channel rest-browser:{$browser_id} rest-browser rest-response-{$response_code}' data-browser-id='{$browser_id}'>\n\
            <script src='rest/rest-listeners.js'></script>\n\
            <link rel='stylesheet' href='rest/rest.css' type='text/css'>\n\
            <legend class='title'>\n\
                <span class='command'>GET</span> <span class='url'>{$request_url}</span>\n\
            </legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE rest-browser:{$browser_id}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE rest-browser:{$browser_id}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE rest-browser:{$browser_id}'>[x]</a>\n\
            </div>\n\
            <nav>\n\
                <form name='rest-browser-navigation-form'>\n\
                    <button type='submit' name='back'>&#8678;</button>\n\
                    <button type='submit' name='forward'>&#8680;</button>\n\
                    <button type='submit' name='home'>&#8962;</button>\n\
                    <input name='url' type='text' value='{$request_url}' />\n\
                    <button type='submit' name='navigate'>&#8476;</button>\n\
                </form>\n\
            </nav>\n\
            <section class='rest-body'>{$response_body}</section>\n\
            <footer class='rest-status'>{$response_code} {$response_text}</footer>\n\
        </article>";


    var headerBody = responseText;
    var responseBody = '';
    var splitPos = headerBody.indexOf("\n\n");
    if(splitPos !== -1) {
        headerBody = responseText.substr(0, splitPos);
        responseBody = responseText.substr(splitPos).trim();
    }
    var headers = headerBody.split(/\n/);
    var headerFirstLine = headers.shift();
    var headerValues = {};
    for(var i=0; i<headers.length; i++) {
        var splitHeader = headers[i].split(': ');
        headerValues[splitHeader[0].toLowerCase()] = splitHeader.length > 0 ? splitHeader[1] : true;
    }
    var match = /^http\/1.1 (\d+) ?(.*)$/i.exec(headerFirstLine);
    if(!match)
        throw new Error("Invalid HTTP Response: " + headerFirstLine);
    var responseCode = parseInt(match[1]);
    var responseCodeText = match[2];
    var requestURL = headerValues['request-url'];
    if(!requestURL)
        throw new Error("Unknown request-url for response: Header is missing");
    var browserID = headerValues['browser-id'];
    if(!browserID)
        throw new Error("Unknown browser-id for response:\n" + responseText);

    //RestDB.listURLIndex(contentURL, function(urls) {
    //    var pathHTML = "<ul class='path-index'>";
    //
    //    for(var i=0; i<urls.length; i++)
    //        pathHTML += "\t<li><a href='" + urls[i][0] + "'>" + urls[i][1] + "</a></li>";
    //    pathHTML += "</ul>";
    //    TEMPLATE_INDEX = TEMPLATE_INDEX.replace(/{\$html_ul_index}/gi, pathHTML);
    //    callback(TEMPLATE_INDEX);
    //});
    //

    // Callback
    callback(HTTP_BROWSER_TEMPLATE
        .replace(/{\$response_body}/gi, responseBody)
        .replace(/{\$response_code}/gi, responseCode)
        .replace(/{\$response_text}/gi, responseCodeText)
        .replace(/{\$browser_id}/gi, browserID)
        .replace(/{\$request_url}/gi, requestURL)
    );

};


var templateRestResponseBody = function(body, url, code, text, headers, callback) {

    var RESPONSE_BODY_TEMPLATE = "\
HTTP/1.1 {$response_code} {$response_text}\n\
Content-type: text/html\n\
Content-length: {$response_length}\n\
Request-url: {$request_url}\n\
{$response_headers}\
\n\n\
{$response_body}";

    callback(RESPONSE_BODY_TEMPLATE
        .replace(/{\$response_headers}/gi, headers.trim())
        .replace(/{\$response_code}/gi, code || '200')
        .replace(/{\$response_text}/gi, text || 'OK')
        .replace(/{\$request_url}/gi, url)
        .replace(/{\$response_length}/gi, body.length)
        .replace(/{\$response_body}/gi, body)
    );
};

var EXAMPLE_VOTE = "\
        <ul draggable='true' class='app.vote' data-id='abcd'>\n\
            <script src='app/vote/vote-listeners.js'></script>\n\
            <lh class='app.vote.title'>Vote 'abcd'</lh>\n\
            <li class='app.vote.option' data-option-id='abcd.1'>Option #1</li>\n\
            <li class='app.vote.option' data-option-id='abcd.2'>Option #2</li>\n\
            <li class='app.vote.option' data-option-id='abcd.3'>Option #3</li>\n\
        </ul>";

var restPutFormTemplate = function(content, callback) {

    var PUT_FORM_TEMPLATE = "\
        <article class='channel put:'>\n\
            <script src='rest/rest-listeners.js'></script>\n\
            <link rel='stylesheet' href='rest/rest.css' type='text/css'>\n\
            <legend class='title'><span class='command'>Put</span> content in your <strong>User Space</strong></legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE put:'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE put:'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE put:'>[x]</a>\n\
            </div>\n\
            <form name='rest-put-form' class='compact' style='float:left;'>\n\
                <label class='label-content'>Create new <span class='html'>HTML</span> content for your <strong>User Space</strong>:<br/>\n\
                    <textarea cols='50' rows='8' class='focus' name='content' required='required' placeholder='Type anything you like.\n\n\t<i>most</i>\n\t<code>html tags</code>\n\t<strong>allowed!</strong>'>{$content}</textarea>\n\
                <br/><br/></label>\n\
                <label class='label-path hide-on-compact'>Post to:<br/>\n\
                    <select name='path'>\n\
                        <option value='~'>My Home Page</option>\n\
                        <option disabled='disabled'>Friend's Web Space...</option>\n\
                        <option disabled='disabled'>Other Web Space...</option>\n\
                        {$html_path_options}\n\
                    </select>\n\
                <br/><br/></label>\n\
                <label class='label-pgp-id-private hide-on-compact'>Post with (PGP Identity):<br/>\n\
                    <select name='pgp_id_private' required='required'>\n\
                        <option value=''>Select a PGP Identity</option>\n\
                        <optgroup class='pgp-identities' label='My PGP Identities (* = passphrase required)'>\n\
                            {$html_pgp_id_private}\n\
                        </optgroup>\n\
                        <optgroup label='Other options'>\n\
                            <option value='' disabled='disabled'>Manage PGP Identities...</option>\n\
                            <option value='' disabled='disabled'>Look up Identity...</option>\n\
                        </optgroup>\n\
                    </select>\n\
                <br/><br/></label>\n\
                <label class='label-passphrase hide-on-compact hide-on-no-passphrase-required'>PGP Passphrase (if required):<br/>\n\
                    <input type='password' name='passphrase' placeholder='Enter your PGP Passphrase'/>\n\
                <br/><br/></label>\n\
                <label class='label-submit hide-on-compact'><hr/>Submit your post:<br/>\n\
                    <input type='submit' value='Post' name='put' />\n\
                </label>\n\
                <label class='label-submit hide-on-compact'>\n\
                    <input class='pressed' type='checkbox' name='preview' {$attr_preview_checked}/>Preview your post\n\
                </label>\n\
            </form>\n\
        </article>";
    // " + EXAMPLE_VOTE + "\n\


    if(typeof PGPDB !== 'function')
        importScripts('pgp/pgp-db.js');

    var form_classes = [];
    var html_pgp_id_private_html = '';
    var html_path_options = '';
    PGPDB.queryPrivateKeys(function(privateKeyData) {
        var optionValue = privateKeyData.id_private + "," + privateKeyData.id_public + (privateKeyData.passphrase_required ? ',1' : ',0');

        if(privateKeyData.default)
            form_classes.push(privateKeyData.passphrase_required ? 'passphrase-required' : 'no-passphrase-required');

        html_pgp_id_private_html +=
            '<option' + (privateKeyData.default ? ' selected="selected"' : '') + ' value="' + optionValue + '">' +
            (privateKeyData.passphrase_required ? '(*) ' : '') + privateKeyData.user_id.replace(/</, '&lt;') +
            '</option>';
    }, function() {

        // Callback
        callback(PUT_FORM_TEMPLATE
                .replace(/{\$content}/gi, content || '')
                .replace(/{\$html_pgp_id_private}/gi, html_pgp_id_private_html || '')
                .replace(/{\$form_class}/gi, form_classes.join(' '))
                .replace(/{\$html_path_options}/gi, html_path_options || '')
                .replace(/{\$attr_preview_checked}/gi, "checked='checked'") // TODO: get from config
        );
    });
};


var restPutFormTemplatePreview = function(content, callback) {
// TODO: variables for topic, url, image etc

    var PUT_FORM_PREVIEW_TEMPLATE = "\
        <article class='channel put-preview:'>\n\
            <script src='rest/rest-listeners.js'></script>\n\
            <link rel='stylesheet' href='rest/rest.css' type='text/css'>\n\
            <legend class='title'><span class='command'>Preview</span></legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE put:'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE put:'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE put:'>[x]</a>\n\
            </div>\n\
            <section class='put-preview-content:' style='position:relative;'>{$content}</section>\n\
            <br/>\n\
            <form name='rest-put-preview-form' >\n\
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
/**
 * Created by ari on 6/19/2015.
 */

// Client Script
if(typeof document === 'object')
    (function() {
        // Events

        self.addEventListener('submit', onFormEvent, false);
        //self.addEventListener('change', onFormEvent);
        self.addEventListener('input', onFormEvent, false);

        function onFormEvent(e, formElm) {
            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
            if(formElm.nodeName.toLowerCase() !== 'form')
                return false;

            switch(formElm.getAttribute('name')) {
                case 'pgp-contact-list':
                    refreshPGPContactList(e, formElm);
                    if(e.type === 'submit')
                        submitPGPContactList(e, formElm);
                    return true;

                default:
                    return false;
            }
        }


        // For HTTP Content Database access
        includeScript('keyspace/ks-db.js');

        function includeScript(scriptPath) {
            var head = document.getElementsByTagName('head')[0];
            if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
                var newScript = document.createElement('script');
                newScript.setAttribute('src', scriptPath);
                head.appendChild(newScript);
            }
        }

    })();

// Worker Script
if(typeof module === 'object') (function() {
    module.exports.renderPGPContactList = renderPGPContactList;
    function renderPGPContactList (callback) {

        self.exports = {};
        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        var status_box = '';
        var html_contact_entries = '';

        // TODO: show public keys, private keys, active channels...

        // Query public keys
        var path = 'public/id';
        var count = 0;
        KeySpaceDB.queryAll(path, function(err, contentEntry) {
            if(err)
                throw new Error(err);

            if(contentEntry) {

                count++;
                renderPGPContactListEntry(contentEntry, function(html) {
                    html_contact_entries += html;
                });

            } else {
                if(count === 0)
                    status_box = (status_box ? status_box + "<br/>" : '') + "<strong>No PGP Identities found</strong><br/>" +
                        "<span class='info'>You may <a href='#KEYGEN'>Generate</a>  a new PGP Key Pair Identity</span>";

                var TEMPLATE_URL = "pgp/contact/render/pgp-contact-list.html";

                var xhr = new XMLHttpRequest();
                xhr.open("GET", TEMPLATE_URL, false);
                xhr.send();
                if(xhr.status !== 200)
                    throw new Error("Error: " + xhr.responseText);
                callback(xhr.responseText
                    .replace(/{\$status_box}/gi, status_box || '')
                    .replace(/{\$html_contact_entries}/gi, html_contact_entries || '')
                );
            }
        });


        return true;
    }

    module.exports.renderPGPContactListEntry = renderPGPContactListEntry;
    function renderPGPContactListEntry(contentEntry, callback) {
        var CONTACT_TEMPLATE_ENTRY = "\
        <div class='pgp-contact-entry:'>\
            <label>\n\
                <fieldset class='pgp-id-box pgp-id-box:{$id_public}'>\n\
                    <legend class='title'>\n\
                        <input type='checkbox' value='{$id_public}' name='selected:{$id_public}'/> <span class='user'>{$user_id}</span>\n\
                    </legend>\n\
                    <strong>Public ID:&nbsp;&nbsp;</strong> <span class='fingerprint'>{$id_public}</span><br/>\n\
                    <strong>User ID:&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='user'>{$user_id}</span><br/>\n\
                </fieldset>\n\
            </label>\
        </div>\
";

        // Callback
        callback(CONTACT_TEMPLATE_ENTRY
                //.replace(/{\$id_private}/gi, contentEntry.pgp_id_private)
                .replace(/{\$id_public}/gi, contentEntry.pgp_id_public)
                //.replace(/{\$id_private_short}/gi, contentEntry.pgp_id_private.substr(contentEntry.pgp_id_private.length - 8))
                .replace(/{\$id_public_short}/gi, contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8))
                //.replace(/{\$block_private}/gi, privateKeyBlock)
                //.replace(/{\$block_public}/gi, privateKeyData.block_public)
                .replace(/{\$user_id}/gi, contentEntry.user_id.replace(/</g, '&lt;'))
                //.replace(/{\$user_name}/gi, privateKeyData.user_name || '')
                //.replace(/{\$user_email}/gi, privateKeyData.user_email || '')
                //.replace(/{\$user_comment}/gi, privateKeyData.user_comment || '')
                //.replace(/{\$passphrase_required}/gi, contentEntry.passphrase_required ? "Yes" : "No")
            //.replace(/{\$is_default}/gi, privateKeyData.default === '1' ? "<strong>Yes</strong>" : "No")
            //.replace(/{\$class}/gi, privateKeyData.default === '1' ? " pgp-id-box-default" : "")
            //.replace(/{\$default}/gi, privateKeyData.default)
        );
    }
})();
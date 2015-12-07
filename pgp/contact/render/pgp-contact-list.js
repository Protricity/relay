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
        var html_private_key_entries = '';
        var html_public_key_entries = '';
        var html_channel_entries = '';

        var html_command_options = '';

        // Query public keys
        var path = 'public/id';
        KeySpaceDB.queryAll(path, function(err, contentEntry) {
            if(err)
                throw new Error(err);

            if(contentEntry) {
                renderPGPContactListEntry(contentEntry, function(html) {
                    html_public_key_entries += html;
                });

            } else {

                var path = '.private/id';
                KeySpaceDB.queryAll(path, function(err, contentEntry) {
                    if(err)
                        throw new Error(err);

                    if(contentEntry) {
                        renderPGPContactListEntry(contentEntry, function(html) {
                            html_private_key_entries += html;
                        });

                    } else {

                        var TEMPLATE_URL = "pgp/contact/render/pgp-contact-list.html";

                        var xhr = new XMLHttpRequest();
                        xhr.open("GET", TEMPLATE_URL, false);
                        xhr.send();
                        if(xhr.status !== 200)
                            throw new Error("Error: " + xhr.responseText);
                        callback(xhr.responseText
                                .replace(/{\$status_box}/gi, status_box || '')
                                .replace(/{\$html_private_key_entries}/gi, html_private_key_entries || '')
                                .replace(/{\$html_public_key_entries}/gi, html_public_key_entries || '')
                                .replace(/{\$html_channel_entries}/gi, html_channel_entries || '')
                                .replace(/{\$html_command_options}/gi, html_command_options || '')
                        );
                                //status_box = (status_box ? status_box + "<br/>" : '') + "<strong>No PGP Identities found</strong><br/>" +
                                //    "<span class='info'>You may <a href='#KEYGEN'>Generate</a>  a new PGP Key Pair Identity</span>";

                    }
                });
            }
        });



        return true;
    }

    var i=0;
    module.exports.renderPGPContactListEntry = renderPGPContactListEntry;
    function renderPGPContactListEntry(contentEntry, callback) {
        var TEMPLATE_URL = "pgp/contact/render/pgp-contact-list-entry.html";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        // TODO: cache xhr

        var status = 'online';
        var user_icon_path = 'pgp/contact/render/icons/user_icon_default.png';

        // Callback
        callback(xhr.responseText
                .replace(/{\$id_public}/gi, contentEntry.pgp_id_public)
                .replace(/{\$id_public_short}/gi, contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8))
                .replace(/{\$name}/gi, contentEntry.user_id.replace(/</g, '&lt;'))
                .replace(/{\$status}/gi, status)
                .replace(/{\$i}/gi, i++)
                .replace(/{\$user_icon_path}/gi, user_icon_path)
        );
    }
})();
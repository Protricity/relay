/**
 * Created by ari on 6/19/2015.
 */

// Worker Script
if(typeof module !== 'object')
    var module = {exports:{}};

(function() {

    module.exports.renderPGPContactList = renderPGPContactList;
    function renderPGPContactList(callback) {

        if(typeof KeySpaceDB === 'undefined') {
            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;
        }

        if(typeof SettingsDB === 'undefined') {
            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;
        }

        var HTML_COMMAND_DEFAULT = '';
        var HTML_CHANNEL_DEFAULT =
            "<li class='pgp-contact-default_info'>" +
            "No Active Channels. " +
            "<br/><a href='#JOIN'>Join</a> a channel..." +
            "</li>";

        var HTML_PRIVATE_KEY_DEFAULT =
            "<li class='pgp-contact-default_info'>" +
            "No Private Keys Found. " +
            "<br/><a href='#KEYGEN'>KeyGen</a> a new Identity..." +
            "</li>";

        var HTML_PUBLIC_KEY_DEFAULT =
            "<li class='pgp-contact-default_info'>" +
            "No Public Keys Found. " +
            "<br/><a href='#PGP.ADD'>Search</a> for Contact..." +
            "</li>";

        var TEMPLATE_URL = "pgp/contact/render/pgp-contact-list.html";

        var nick_value = '';
        var html_private_key_entries = '';
        var html_public_key_entries = '';
        var html_channel_entries = '';
        var html_command_options = '';
        var status_box = '';

        // Query public keys
        var path = 'public/id';
        KeySpaceDB.queryAll(path, function(err, contentEntry) {
            if(err)
                throw new Error(err);

            if(contentEntry) {

                renderPGPContactListEntry(
                    contentEntry.user_id,
                    contentEntry.pgp_id_private + ' - online',
                    'pgp/contact/render/icons/user_icon_default.png',
                    function(html) {
                        html_public_key_entries += html;
                    });

            } else {

                var path = '.private/id';
                KeySpaceDB.queryAll(path, function(err, contentEntry) {
                    if(err)
                        throw new Error(err);

                    if(contentEntry) {

                        renderPGPContactListEntry(
                            contentEntry.user_id,
                            contentEntry.pgp_id_private + ' - private key',
                            'pgp/contact/render/icons/user_icon_default.png',
                            function(html) {
                                html_private_key_entries += html;
                            });

                    } else {


                        // Check Nick
                        SettingsDB.getSettings("channel.nick", function(nickSettings) {
                            if(nickSettings && nickSettings.username) {
                                nick_value = nickSettings.username;
                            }

                        });

                        // Query Auto Join Channels
                        SettingsDB.getAllSettings("channel:*", function(channelSettings) {
                            if(channelSettings) {
                                if(channelSettings.auto_join === 1) {
                                    renderPGPContactListEntry(
                                        channelSettings.name_original_case,
                                        '0-25 users',
                                        'pgp/contact/render/icons/channel_icon_default.png', // TODO: channel icon
                                            function(html) {
                                                html_channel_entries += html;
                                            });
                                }

                            } else {
                                var xhr = new XMLHttpRequest();
                                xhr.open("GET", TEMPLATE_URL, false);
                                xhr.send();
                                if(xhr.status !== 200)
                                    throw new Error("Error: " + xhr.responseText);
                                callback(xhr.responseText
                                        .replace(/{\$status_box}/gi, status_box || '')
                                        .replace(/{\$nick_value}/gi, nick_value || '')
                                        //.replace(/{\$html_contact_list_sections}/gi, html_contact_list_sections)
                                        .replace(/{\$html_private_key_entries}/gi, html_private_key_entries || HTML_PRIVATE_KEY_DEFAULT)
                                        .replace(/{\$html_public_key_entries}/gi, html_public_key_entries || HTML_PUBLIC_KEY_DEFAULT)
                                        .replace(/{\$html_channel_entries}/gi, html_channel_entries || HTML_CHANNEL_DEFAULT)
                                        .replace(/{\$html_command_options}/gi, html_command_options || HTML_COMMAND_DEFAULT)
                                );
                            }
                        });


                    }
                });
            }
        });

    }

    var i=0;
    module.exports.renderPGPContactListEntry = renderPGPContactListEntry;
    function renderPGPContactListEntry(name, status, user_icon_path, callback) {
        var TEMPLATE_URL = "pgp/contact/render/pgp-contact-list-entry.html";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        // TODO: cache xhr

        //status = 'online';
        user_icon_path = user_icon_path || 'pgp/contact/render/icons/user_icon_default.png';

        // Callback
        callback(xhr.responseText
                //.replace(/{\$id_public}/gi, contentEntry.pgp_id_public)
//                 .replace(/{\$id_public_short}/gi, contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8))
                .replace(/{\$name}/gi, name)
                .replace(/{\$status}/gi, status)
                .replace(/{\$user_icon_path}/gi, user_icon_path)
                .replace(/{\$i}/gi, i++)
        );
    }

})();

// Client Script
if(typeof document === 'object')
    (function() {
        // Events
        var contactExports = module.exports;

        self.addEventListener('submit', onFormEvent, false);
        self.addEventListener('change', onFormEvent);
//         self.addEventListener('input', onFormEvent, false);

        function onFormEvent(e, formElm) {
            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
            if(formElm.nodeName.toLowerCase() !== 'form')
                return false;

            switch(formElm.getAttribute('name')) {
                case 'pgp-contact-list-form':
                    updateCommandList(e, formElm);
                    //contactExports.refreshPGPContactList(e, formElm);
                    //if(e.type === 'submit')
                        //contactExports.submitPGPContactList(e, formElm);
                    return true;

                default:
                    return false;
            }
        }


        function updateCommandList(e, formElm) {
            var checkedContactEntries = formElm.querySelectorAll('input:checked.pgp-contact-entry-checkbox\\:');
            console.log(checkedContactEntries);

            var count = checkedContactEntries.length;
            var html_command_options = '';
            html_command_options +=
                "<option value=''>" +
                    (count > 0 ? '('+count+')' : 'No') + " Contacts Selected..." +
                "</option>";

            html_command_options +=
                "<optgroup label='Choose a command'>";

            if(count > 0) {
                html_command_options +=
                    "<option value='MESSAGE'>" +
                        "MESSAGE (" + count + ") Contacts" +
                    "</option>";
            }

            // TODO: if user, if channel if etc

            html_command_options +=
                "</optgroup>";

            formElm.command.innerHTML = html_command_options;
        }


        // For HTTP Content Database access
        includeScript('keyspace/ks-db.js');

        // For HTTP Content Database access
        includeScript('client/settings/settings-db.js');

        function includeScript(scriptPath) {
            var head = document.getElementsByTagName('head')[0];
            if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
                var newScript = document.createElement('script');
                newScript.setAttribute('src', scriptPath);
                head.appendChild(newScript);
            }
        }

    })();

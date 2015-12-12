/**
 * Created by ari on 6/19/2015.
 */

// Worker Script
if(typeof module !== 'object')
    var module = {exports:{}};

(function() {

    module.exports.renderPGPContactList = renderPGPContactList;
    function renderPGPContactList(callback) {

        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        if(typeof SettingsDB === 'undefined') {
            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;
        }

        var HTML_COMMAND_DEFAULT = '';
        var HTML_CHANNEL_DEFAULT =
            "<li class='keyspace-contact-default_info'>" +
            "No Active Channels. " +
            "<br/><a href='#JOIN'>Join</a> a channel..." +
            "</li>";

        var HTML_PRIVATE_KEY_DEFAULT =
            "<li class='keyspace-contact-default_info'>" +
            "No Private Keys Found. " +
            "<br/><a href='#PGP.KEYGEN'>KeyGen</a> a new Identity..." +
            "</li>";

        var HTML_PUBLIC_KEY_DEFAULT =
            "<li class='keyspace-contact-default_info'>" +
            "No Public Keys Found. " +
            "<br/><a href='#PGP.ADD'>Search</a> for Contact..." +
            "</li>";

        var TEMPLATE_URL = "keyspace/contacts/render/ks-contact-list.html";

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
                var hostingStatus = 'offline' ;

                // TODO: get socket user name
                var html_commands =
                    "<a href='javascript:Client.execute(\"MESSAGE " + contentEntry.pgp_id_public + "\");'>" +
                        "<span class='command'>Message</span> " + // contentEntry.user_id +
                    "</a>" +
                    "<a href='javascript:Client.execute(\"CHANLIST " + contentEntry.pgp_id_public + "\");'>" +
                        "<span class='command'>ChanList</span>" +
                    "</a>" +
                    "<br/>" +
                    "<a href='javascript:Client.execute(\"GET " + contentEntry.pgp_id_public + "\");'>" +
                        "<span class='command'>Get</span>" +
                    "</a>" +
                    "<a href='javascript:Client.execute(\"GET " + contentEntry.pgp_id_public + "/public/profile\");'>" +
                        "<span class='command'>Profile</span>" +
                    "</a>" +
                    "<br/>" +
                    "<a href='javascript:Client.execute(\"PGP.EXPORT --with " + contentEntry.pgp_id_public + "\");'>" +
                        "<span class='command'>Export</span>" + // Key" +
                    "</a>" +
                    "<a href='javascript:Client.execute(\"PGP.DELETE " + contentEntry.pgp_id_public + "\");'>" +
                        "<span class='command'>Delete</span>" +
                    "</a>";

                renderPGPContactListEntry(
                    contentEntry.user_id,
                    contentEntry.pgp_id_public +
                    ' <span class="' + hostingStatus.toLowerCase() + '">' +
                        hostingStatus.toLowerCase() +
                    '</span>',
                    'keyspace/contacts/render/icons/user_icon_default.png',
                    'public-key',
                    html_commands,
                    function(html) {
                        html_public_key_entries += html;
                    });

            } else {

                var path = '.private/id';
                KeySpaceDB.queryAll(path, function(err, contentEntry) {
                    if(err)
                        throw new Error(err);

                    if(contentEntry) {
                        var socketHost = KeySpaceDB.getSocketHost(contentEntry.pgp_id_public);
                        var hostingStatus = socketHost !== null ? 'online' : 'offline' ;
                        var hostingCommand = socketHost !== null ? 'offline' : 'online';
//                         console.log(socketHost, hostingStatus, hostingCommand);

                        var html_commands =
                            "<a href='javascript:Client.execute(\"KEYSPACE.HOST " + contentEntry.pgp_id_public + "\");'>" +
                                "<span>Go</span>" +
                                "<br />" +
                                "<span class='command " + hostingCommand.toLowerCase() + "'>" + hostingCommand + "</span>" +
                            "</a>" +
                            "<br/>" +
                            "<a href='javascript:Client.execute(\"KEYSPACE.GET " + contentEntry.pgp_id_public + "\");'>" +
                                "<span class='command'>Get</span>" +
                            "</a>" +
                            "<a href='javascript:Client.execute(\"KEYSPACE.PUT --with " + contentEntry.pgp_id_public + "\");'>" +
                                "<span class='command'>Put</span>" + // to your KeySpace" +
                                //"<br />" +
                                //"<span>to KeySpace</span>" +
                            "</a>" +
                            "<br/>" +
                            "<a href='javascript:Client.execute(\"PGP.EXPORT --with " + contentEntry.pgp_id_public + "\");'>" +
                                "<span class='command'>Export</span>" + // Key" +
                            "</a>" +
                            "<a href='javascript:Client.execute(\"PGP.DELETE " + contentEntry.pgp_id_public + "\");'>" +
                                "<span class='command'>Delete</span>" +
                            "</a>";

                        renderPGPContactListEntry(
                            contentEntry.user_id,

                            contentEntry.pgp_id_private +
                            ' <span class="' + hostingStatus.toLowerCase() + '">' +
                                hostingStatus.toLowerCase() +
                            '</span>',
                            'keyspace/contacts/render/icons/user_icon_default.png',
                            'private-key',
                            html_commands,
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

                                var html_commands =
                                    "<a href='javascript:Client.execute(\"JOIN " + channelSettings.name_original_case + "\");'>" +
                                        "<span class='command'>Join</span> " + // channelSettings.name_original_case +
                                    "</a>" +
                                    "<a href='javascript:Client.execute(\"LEAVE " + channelSettings.name_original_case + "\");'>" +
                                        "<span class='command'>Leave</span> " + // channelSettings.name_original_case +
                                    "</a>";

                                if(channelSettings.auto_join === 1) {
                                    renderPGPContactListEntry(
                                        channelSettings.name_original_case,
                                        '<span class="status">0-25 users</span>',
                                        'keyspace/contacts/render/icons/channel_icon_default.png',
                                        'channel',
                                        html_commands,
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
    function renderPGPContactListEntry(name, status, user_icon_path, type, html_commands, callback) {
        var TEMPLATE_URL = "keyspace/contacts/render/ks-contact-list-entry.html";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        // TODO: cache xhr

        //status = 'online';
        user_icon_path = user_icon_path || 'keyspace/contacts/render/icons/user_icon_default.png';


        // Callback
        callback(xhr.responseText
                //.replace(/{\$id_public}/gi, contentEntry.pgp_id_public)
//                 .replace(/{\$id_public_short}/gi, contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8))
                .replace(/{\$type}/gi, type)
                .replace(/{\$name}/gi, name)
                .replace(/{\$status}/gi, status)
                .replace(/{\$user_icon_path}/gi, user_icon_path)
                .replace(/{\$html_commands}/gi, html_commands)
                .replace(/{\$i}/gi, i++)
        );
    }

})();

// Client Script
if(typeof document === 'object')
    (function() {
        // Events
        var contactExports = module.exports;

        document.addEventListener('submit', onFormEvent, false);
        document.addEventListener('change', onFormEvent);
        //document.addEventListener('response:settings', onKeySpaceEvent);
//         document.addEventListener('input', onFormEvent, false);

        function onFormEvent(e, formElm) {
            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
            if(formElm.nodeName.toLowerCase() !== 'form')
                return false;

            switch(formElm.getAttribute('name')) {
                case 'ks-contact-list-form':
                    updateCommandList(e, formElm);
                    //contactExports.refreshPGPContactList(e, formElm);
                    if(e.type === 'submit')
                        e.preventDefault();
                        //contactExports.submitPGPContactList(e, formElm);
                    return true;

                default:
                    return false;
            }
        }


        function updateCommandList(e, formElm) {
            var checkedContactEntries = formElm.querySelectorAll('input:checked.keyspace-contact-entry-checkbox\\:');
            var channels = formElm.querySelectorAll('input:checked.keyspace-contact-entry-checkbox\\:[data-type=channel');
            var privateKeys = formElm.querySelectorAll('input:checked.keyspace-contact-entry-checkbox\\:[data-type=private-key');
            var publicKeys = formElm.querySelectorAll('input:checked.keyspace-contact-entry-checkbox\\:[data-type=public-key');

            var html_command_options = '';
            html_command_options +=
                "<option value=''>" +
                    (checkedContactEntries.length > 0 ? '(' + checkedContactEntries.length + ')' : 'No') + " Contacts Selected" +
                "</option>";

            if(checkedContactEntries.length > 0)
                html_command_options +=
                    "<option value=''>Clear Selected Contacts</option>";

            // Public Keys

            if(publicKeys.length > 0)
                html_command_options +=
                    "<optgroup label='User Commands'>" +
                        "<option value='MESSAGE [user]'>" +
                            "MESSAGE (" + publicKeys.length + ") Contact" + (publicKeys.length === 1 ? '' : 's') +
                        "</option>" +
                    "</optgroup>" +
                    "<optgroup label='Public Key Commands'>" +
                        "<option value='PGP.EXPORT [public-key]'>" +
                            "EXPORT (" + publicKeys.length + ") Public Key" + (publicKeys.length === 1 ? '' : 's') +
                        "</option>" +
                        "<option value='PGP.DELETE [public-key]'>" +
                            "DELETE (" + publicKeys.length + ") Contact" + (publicKeys.length === 1 ? '' : 's') + " from list" +
                        "</option>" +
                    "</optgroup>";


            // Private Keys

            if(privateKeys.length > 0)
                html_command_options +=
                    //"<optgroup label='Account Commands'>" +
                    //    "<option value='MESSAGE [user]'>" +
                    //        "MESSAGE (" + privateKeys.length + ") Account" + (privateKeys.length === 1 ? '' : 's') +
                    //    "</option>" +
                    //"</optgroup>" +
                    "<optgroup label='Private Key Commands'>" +
                        "<option value='PGP.EXPORT [public-key]'>" +
                            "EXPORT (" + privateKeys.length + ") Private Key" + (privateKeys.length === 1 ? '' : 's') +
                        "</option>" +
                        "<option value='PGP.DELETE [public-key]'>" +
                            "DELETE (" + privateKeys.length + ") Account" + (privateKeys.length === 1 ? '' : 's') + " from list" +
                        "</option>" +
                    "</optgroup>";



            // Channels

            if(channels.length > 0)
                html_command_options +=
                    "<optgroup label='Channel Commands'>" +
                        "<option value='JOIN [channel]'>" +
                            "JOIN (" + channels.length + ") Channel" + (channels.length === 1 ? '' : 's') +
                        "</option>" +
                        "<option value='LEAVE [channel]'>" +
                            "LEAVE (" + channels.length + ") Channel" + (channels.length === 1 ? '' : 's') +
                        "</option>" +
                    "</optgroup>";


            formElm.classList[checkedContactEntries.length > 0 ? 'add' : 'remove']('selected-contacts');
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

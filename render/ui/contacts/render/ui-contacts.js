/**
 * Created by ari on 6/19/2015.
 */

// Worker Script
if(typeof module !== 'object')
    var module = {exports:{}};

(function() {

    module.exports.renderUIContactList = renderUIContactList;
    module.exports.renderUIContactListKeySpaceSubscriptions = renderUIContactListKeySpaceSubscriptions;
    module.exports.renderUIContactListChannelSubscriptions = renderUIContactListChannelSubscriptions;


    function renderUIContactListKeySpaceSubscriptions(callback) {
        var html_command_options = '';
        var html_public_key_entries = '';

        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        self.module = {exports: {}};
        importScripts('client/subscriptions/client-subscriptions.js');
        var ClientSubscriptions = self.module.exports.ClientSubscriptions;

        var publicKeys = [];
        ClientSubscriptions.searchKeySpaceSubscriptions(null, null,
            function(pgp_id_public, mode, argString) {
                pgp_id_public = pgp_id_public.toUpperCase();
                for(var i=0; i<publicKeys.length; i++) {
                    if(publicKeys[i][0] === pgp_id_public) {
                        publicKeys[i][1].push([mode, argString]);
                        return;
                    }
                }
                publicKeys.push([pgp_id_public, [[mode, argString]]]);
            }
        );

         //console.log("KeySpace Contacts: ", publicKeys);

        for(i=0; i<publicKeys.length; i++)
            (function(i, pgp_id_public, modes) {

                var requestURL = 'http://' + pgp_id_public + '.ks/public/id';
                KeySpaceDB.queryOne(requestURL,
                    function(err, publicKeyContentEntry) {
                        if(err || !publicKeyContentEntry) {
                            if(i >= publicKeys.length-1)
                                callback(html_public_key_entries, html_command_options);
                            // TODO: unsubscribe from missing entry? No. That's handled via event listeners
                            return;
                        }

                        var user_id = publicKeyContentEntry.user_id || pgp_id_public;

                        var subscriptionStatus = false ? 'Subscribe' : 'Unsubscribe' ;
                        //var user_id = ClientSubscriptions.getCachedPublicKeyUserID(pgp_id_public)
                        //    || pgp_id_public;
                        var hostingStatus = ClientSubscriptions.getKeySpaceStatus(pgp_id_public);
                        var hostingCommand = hostingStatus.toLowerCase() === 'online' ? 'Offline' : 'Online';
                        var isKeySpaceAuthorized = ClientSubscriptions.isKeySpaceAuthorized(pgp_id_public);
                        var keyType = 'public-key';

                        var html_commands =
                            getCommandHTML("MESSAGE " + pgp_id_public, "Message") +
                            getCommandHTML("GET " + pgp_id_public + "/public/profile", "Profile") +
                            getCommandHTML("GET " + pgp_id_public, "Get") +
                            "<br/>" +
                            getCommandHTML("PGP.EXPORT " + pgp_id_public, "Export") +
                            getCommandHTML("PGP.DELETE " + pgp_id_public, "Delete");

                        if(isKeySpaceAuthorized) {
                            keyType = 'private-key';

                            html_commands +=
                                "<br/>" +
                                getCommandHTML("KEYSPACE.STATUS " + pgp_id_public + " " + hostingCommand.toUpperCase(), "Go " + hostingCommand)
                        } else {
                        }


                        renderUIContactListEntry(
                            user_id,
                            pgp_id_public +
                            ' <span class="' + hostingStatus.toLowerCase() + '">' +
                            hostingStatus.toLowerCase() +
                            '</span>',
                            'render/ui/contacts/render/icons/user_icon_default.png',
                            keyType,
                            html_commands,
                            function(html) {
                                html_public_key_entries += html;
                                if(i >= publicKeys.length-1)
                                    callback(html_public_key_entries, html_command_options);
                            });
                    }
                );
            })(i, publicKeys[i][0], publicKeys[i][1]);
    }


    function renderUIContactListChannelSubscriptions(callback) {
        var html_command_options = '';
        var html_channel_entries = '';

        var channels = {};

        self.module = {exports: {}};
        importScripts('client/subscriptions/client-subscriptions.js');
        var ClientSubscriptions = self.module.exports.ClientSubscriptions;

        ClientSubscriptions.searchChannelSubscriptions(null, null,
            function(channelName, mode, argString) {
                var channelNameLowerCase = channelName.toLowerCase();
                if(typeof channels[channelNameLowerCase] === 'undefined')
                    channels[channelNameLowerCase] = {modes:[], original_case: channelName};
                var modes = channels[channelNameLowerCase].modes;
                if(modes.indexOf(mode) === -1)
                    modes.push(mode);

                // TODO: channel subscriber count
            });

//         console.log("Channels: ", channels);

        for(var channelNameLowerCase in channels) {
            if(channels.hasOwnProperty(channelNameLowerCase)) {
                var modes = channels[channelNameLowerCase].modes;
                var channelName = channels[channelNameLowerCase].original_case || channelNameLowerCase;

                // TODO: pressed buttons
                var html_commands = getCommandHTML("CHANNEL.CHAT " + channelNameLowerCase, 'Chat', modes.indexOf('chat') === -1 ? '' : 'subscribed');
                html_commands += getCommandHTML("CHANNEL.AUDIO " + channelNameLowerCase, 'Audio', 'disabled');
                html_commands += getCommandHTML("CHANNEL.VIDEO " + channelNameLowerCase, 'Video', 'disabled');

                //html_commands += "<br/>";
                //html_commands += getCommandHTML("CHANNEL.LEAVE " + channelName, "LEAVE");

                renderUIContactListEntry(
                    channelName,
                    '<span class="status">1-25 subscribers</span>',
                    'render/ui/contacts/render/icons/channel_icon_default.png',
                    'channel',
                    html_commands,
                    function(html) {
                        html_channel_entries += html;
                    });
            }
        }

        callback(html_channel_entries, html_command_options);
    }

    function renderUIContactList(callback) {


        var nick_value = '';
        var status_box = '';
        var html_command_options = '';

        renderUIContactListKeySpaceSubscriptions(function(html_keyspace_entries, _html_command_options) {
            html_command_options += _html_command_options;

            renderUIContactListChannelSubscriptions(function(html_channel_entries, _html_command_options) {
                html_command_options += _html_command_options;

                var TEMPLATE_URL = "render/ui/contacts/render/ui-contacts.html";

                var xhr = new XMLHttpRequest();
                xhr.open("GET", TEMPLATE_URL, false);
                xhr.send();
                if(xhr.status !== 200)
                    throw new Error("Error: " + xhr.responseText);
                callback(xhr.responseText
                        .replace(/{\$status_box}/gi, status_box || '')
                        .replace(/{\$nick_value}/gi, nick_value || '')
                        //.replace(/{\$html_contact_list_sections}/gi, html_contact_list_sections)
                        .replace(/{\$html_keyspace_entries}/gi, html_keyspace_entries)
                        .replace(/{\$html_channel_entries}/gi, html_channel_entries)
                        .replace(/{\$html_command_options}/gi, html_command_options)
                );

            });
        });


//
//        var subscriptionList = [];
//        ClientSubscriptions.searchChannelSubscriptions(null, null,
//            function(channel, mode, argString) {
//                subscriptionList.push(Array.prototype.slice.call(arguments));
//            });
//        ClientSubscriptions.searchKeySpaceSubscriptions(null, null,
//            function(pgp_id_public, mode, argString) {
//                subscriptionList.push(Array.prototype.slice.call(arguments));
//            });
//
//        // TODO: query only subscribed keyspace ids and channels duh
//        console.log(subscriptionList);
//
//        // Query public keys
//        var path = 'public/id';
//        KeySpaceDB.queryAll(path, function(err, contentEntry) {
//            if(err)
//                throw new Error(err);
//
//            if(contentEntry) {
//                var socketHost = KeySpaceDB.getSocketHost(contentEntry.pgp_id_public);
//                var hostingStatus = socketHost !== null ? 'online' : 'offline' ;
//                //var subscriptionStatus = true ? 'Subscribe' : 'Unsubscribe' ;
//                //var hostingCommand = socketHost !== null ? 'offline' : 'online';
//
//                // TODO: get socket user name
//                var html_commands =
//                    getCommandHTML("MESSAGE " + contentEntry.pgp_id_public, "Message") +
//                    "<br/>" +
//                    getCommandHTML("GET " + contentEntry.pgp_id_public + "/public/profile", "Profile") +
//                    getCommandHTML("GET " + contentEntry.pgp_id_public, "Get") +
//                    "<br/>" +
//                    getCommandHTML("PGP.EXPORT " + contentEntry.pgp_id_public, "Export") +
//                    getCommandHTML("PGP.DELETE " + contentEntry.pgp_id_public, "Delete");
//
//                renderUIContactListEntry(
//                    contentEntry.user_id,
//                    contentEntry.pgp_id_public +
//                    ' <span class="' + hostingStatus.toLowerCase() + '">' +
//                        hostingStatus.toLowerCase() +
//                    '</span>',
//                    'render/ui/contacts/render/icons/user_icon_default.png',
//                    'public-key',
//                    html_commands,
//                    function(html) {
//                        html_public_key_entries += html;
//                    });
//
//            } else {
//
//                var path = '.private/id';
//                KeySpaceDB.queryAll(path, function(err, contentEntry) {
//                    if(err)
//                        throw new Error(err);
//
//                    if(contentEntry) {
//                        var socketHost = KeySpaceDB.getSocketHost(contentEntry.pgp_id_public);
//                        var hostingStatus = socketHost !== null ? 'online' : 'offline' ;
//                        var hostingCommand = socketHost !== null ? 'offline' : 'online';
////                         console.log(socketHost, hostingStatus, hostingCommand);
//
//                        var html_commands =
//                            getCommandHTML("KEYSPACE.SUBSCRIBE.GET " + contentEntry.pgp_id_public, "Go " + hostingCommand) +
//                            "<br/>" +
//                            getCommandHTML("GET " + contentEntry.pgp_id_public + "/public/profile", "Profile") +
//                            getCommandHTML("GET " + contentEntry.pgp_id_public, "Get") +
//                            getCommandHTML("PUT " + contentEntry.pgp_id_public, "Put") +
//                            "<br/>" +
//                            getCommandHTML("PGP.EXPORT " + contentEntry.pgp_id_public, "Export") +
//                            getCommandHTML("PGP.MANAGE " + contentEntry.pgp_id_public, "Manage") +
//                            getCommandHTML("PGP.DELETE " + contentEntry.pgp_id_public, "Delete");
//
//                        renderUIContactListEntry(
//                            contentEntry.user_id,
//
//                            contentEntry.pgp_id_private +
//                            ' <span class="' + hostingStatus.toLowerCase() + '">' +
//                                hostingStatus.toLowerCase() +
//                            '</span>',
//                            'render/ui/contacts/render/icons/user_icon_default.png',
//                            'private-key',
//                            html_commands,
//                            function(html) {
//                                html_private_key_entries += html;
//                            });
//
//                    } else {
//
//                        //
//                        //// Check Nick
//                        //SettingsDB.getSettings("channel.nick", function(nickSettings) {
//                        //    if(nickSettings && nickSettings.username) {
//                        //        nick_value = nickSettings.username;
//                        //    }
//                        //
//                        //});
//
//
//                        // Query Auto Join Channels
//                        SettingsDB.getAllSettings("channel:*", function(channelSettings) {
//                            if(channelSettings) {
//
//                                var channelName = channelSettings.name_original_case;
//
//                                if(channelSettings.auto_join === 1) {
//
//                                    var subscriptionStatus = true ? 'Subscribe' : 'Unsubscribe' ;
//                                    var html_commands =
//                                        getCommandHTML("CHANNEL." + subscriptionStatus.toUpperCase() + ".GET " + channelName, subscriptionStatus) +
//                                        getCommandHTML("CHAT " + channelName, "Chat") +
//                                        getCommandHTML("AUDIO " + channelName, "Audio") +
//                                        getCommandHTML("VIDEO " + channelName, "Video");
//
//                                    renderUIContactListEntry(
//                                        channelSettings.name_original_case,
//                                        '<span class="status">0-25 users</span>',
//                                        'render/ui/contacts/render/icons/channel_icon_default.png',
//                                        'channel',
//                                        html_commands,
//                                            function(html) {
//                                                html_channel_entries += html;
//                                            });
//                                }
//
//                            } else {
//                                var xhr = new XMLHttpRequest();
//                                xhr.open("GET", TEMPLATE_URL, false);
//                                xhr.send();
//                                if(xhr.status !== 200)
//                                    throw new Error("Error: " + xhr.responseText);
//                                callback(xhr.responseText
//                                        .replace(/{\$status_box}/gi, status_box || '')
//                                        .replace(/{\$nick_value}/gi, nick_value || '')
//                                        //.replace(/{\$html_contact_list_sections}/gi, html_contact_list_sections)
//                                        .replace(/{\$html_private_key_entries}/gi, html_private_key_entries)
//                                        .replace(/{\$html_public_key_entries}/gi, html_public_key_entries)
//                                        .replace(/{\$html_channel_entries}/gi, html_channel_entries)
//                                        .replace(/{\$html_command_options}/gi, html_command_options)
//                                );
//                            }
//                        });
//
//
//                    }
//                });
//            }
//        });

    }

    var i=0;
    module.exports.renderUIContactListEntry = renderUIContactListEntry;
    function renderUIContactListEntry(name, status, user_icon_path, type, html_commands, callback) {
        var TEMPLATE_URL = "render/ui/contacts/render/ui-contacts-entry.html";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        // TODO: cache xhr

        //status = 'online';
        user_icon_path = user_icon_path || 'render/ui/contacts/render/icons/user_icon_default.png';


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

    function getCommandHTML(commandString, commandTitle, commandClasses) {
        commandTitle = commandTitle || commandString;
        return "" +
            "<a href='javascript:Client.execute(\"" + commandString + "\");'" + (commandClasses ? " class='" + commandClasses + "'" : '') + ">" +
                "<span>" + commandTitle + "</span>" +
            "</a>";
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
                case 'ui-contacts-form':
                    updateCommandList(e, formElm);
                    //contactExports.refreshUIContactList(e, formElm);
                    if(e.type === 'submit')
                        e.preventDefault();
                        //contactExports.submitUIContactList(e, formElm);
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

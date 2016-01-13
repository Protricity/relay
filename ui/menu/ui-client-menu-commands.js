/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {

    var activeKeySpaceSuggestions = [];
    var activeChannelSuggestions = [];

    module.exports.initClientUIMenuCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(uiMenuCommand);
        ClientWorkerThread.addResponse(searchResultsListener, true);

        function uiMenuCommand(commandString, e) {
            var match = /^(?:ui\.)?menu(?:\.(list|text|html|render))?\s*(\S*)/i.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var subCommand = (match[1] || "render").toLowerCase();
            var menuCommand = match[2];

            switch(subCommand) {
                case "html":
                case "render":
                    renderMenuHTML(commandString,
                        function(html) {
                            ClientWorkerThread.render(html);
                        }
                    );
                    return true;

                case "text":
                case "list":
                    renderMenuTextResponse(commandString,
                        function(responseString) {
                            ClientWorkerThread.log(responseString);
                            ClientWorkerThread.postResponseToClient(responseString);
                            //ClientWorkerThread.processResponse(responseString);
                        }
                    );
                    return true;

                default:
                    throw new Error("Invalid Sub Command: " + subCommand);
            }
        }

        function searchResultsListener(responseString) {
            var match = /^event (keyspace|channel)\.search\.results([\s\S]+)$/im.exec(responseString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var type = match[1].toLowerCase();

            var activeResults = responseString.split("\n");
            var stats = activeResults.shift().trim().split(" ");
            for(var i=0; i<activeResults.length; i++)
                activeResults[i] = activeResults[i].split(";");

            switch(type) {
                case "keyspace":
                    activeKeySpaceSuggestions = activeResults;
                    break;

                case "channel":
                    activeChannelSuggestions = activeResults;
                    break;
            }

            return false;
        }

    };

    function renderMenuTextResponse(commandString, callback) {
        var match = /^(?:ui\.)?menu(?:\.(?:text|list))?(?:\s+(\S+))?$/i.exec(commandString);
        if (!match)         // If unmatched,
            throw new Error("Invalid Command: " + commandString);   // Pass control to next handler

        var args = (match[1] ? match[1].split(' ') : []);

        var responseString = "UI.MENU.TEXT " + args.join(" ");
        getMenu(args, Section, Item, Done);

        function Section(title) {
            responseString += "\n\n#;" + title;
        }

        function Item(command, title) {
            command = command.replace(/^ui\.menu\s/i, "UI.MENU.TEXT ");
            title = title.replace(/<\/?(span|div|img|p...)\b[^<>]*>/g, "");
            responseString += "\n" + command + ';' + title;
        }

        function Done() {
            callback(responseString);
        }
    }

    function renderMenuHTML(commandString, callback) {
        var match = /^(?:ui\.)?menu(?:\.(?:render|html))?\s*(\S*)/i.exec(commandString);
        if (!match)         // If unmatched,
            throw new Error("Invalid Command: " + commandString);   // Pass control to next handler

        var args = (match[1] ? match[1].split(' ') : []);

        var html = "";
        getMenu(args, Section, Item, Done);

        var sectionCount = 0;
        function Section(title) {
            if(sectionCount > 0)
                html += "</ul><ul>";
            html += "<lh>" + title + "</lh>";
            sectionCount++;
        }

        function Item(command, title) {
            title = title || command;
            html +=
                "<li>" +
                    "<a href='javascript:Client.execute(\"" + command + "\");'>" +
                        title +
                    "</a>" +
                "</li>"
        }

        function Done() {
            var TEMPLATE_URL = "ui/menu/render/ui-menu.html";
            var xhr = new XMLHttpRequest();
            xhr.open("GET", TEMPLATE_URL, false);
            xhr.send();
            if (xhr.status !== 200)
                throw new Error("Error: " + xhr.responseText);

            callback(
                xhr.responseText
                    .replace(/{\$html_menu}/gi, html)
            );

        }
    }


    function getMenu(args, Section, Item, Done) {
        Section("Menu Categories");
        Item("UI.MENU channel", "Channel Subscriptions");
        Item("UI.MENU keyspace", "Contact List");
        Item("UI.MENU command", "Commands Menu");

        if(args.length > 0) {
            var arg = args.shift().toLowerCase();
            switch (arg) {
                case 'channel':
                    return getChannelsMenu(args, Section, Item, Done);
                case 'keyspace':
                    return getKeySpacesMenu(args, Section, Item, Done);
                case 'command':
                    return getCommandsMenu(args, Section, Item, Done);
                default:
                    throw new Error("Unknown Menu arg: " + arg);
            }
        }

        Section("Recent Commands");
        Item("UI.CONTACTS", "Show <span class='command'>Contact</span> List");
        Item("CHANNEL.SEARCH", "<span class='command'>Subscribe</span> to Channels");
        Item("KEYSPACE.SEARCH", "<span class='command'>Search</span> for new Contacts");
        Item("PGP.KEYGEN", "<span class='command'>KeyGen</span> a new PGP Identity");
        Item("PGP.MANAGE", "<span class='command'>Manage</span> your PGP Identities");
        Item("KEYSPACE.FEED", "View your <span class='command'>Feed</span>");
        Item("KEYSPACE.PUT", "<span class='command'>Create</span> KeySpace Content");
        Item("ABOUT", "<span class='command'>About</span> &#8475;elay");

        Done();
    }

    function getKeySpacesMenu(args, Section, Item, Done) {
        if(args.length > 0) {
            return getKeySpaceMenu(args, Section, Item, Done);
        }

        self.module = {exports: {}};
        importScripts("client/subscriptions/client-subscriptions.js");
        var ClientSubscriptions = self.module.exports.ClientSubscriptions;

        // Fetch all Private Key Keyspace Subscriptions (Accounts)
        var accountList = ClientSubscriptions.getAuthorizedKeySpaces();

        // Fetch all Keyspace Subscriptions (Contacts)
        var idList = accountList.slice();
        ClientSubscriptions.searchKeySpaceSubscriptions(null, null,
            function(pgp_id_public, mode, argString) {
                if(idList.indexOf(pgp_id_public.toUpperCase()) === -1)
                    idList.push(pgp_id_public.toUpperCase());
            }
        );

        self.module = {exports: {}};
        importScripts("keyspace/ks-db.js");
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        // Fetch all User IDs for this public key list
        KeySpaceDB.fetchAllPublicKeyUserIDs(idList,
            function(userIDList) {

                Section("Active Contacts");

                // Add each to the active menu
                for (var i = 0; i < userIDList.length; i++) {
                    (function (pgp_id_public, user_id) {
                        Item("UI.MENU keyspace " + pgp_id_public + " " + user_id + " existing", user_id);
                    })(userIDList[i][0], userIDList[i][1]);
                }

                Item("UI.MENU keyspace", "(" + userIDList.length + ") Contacts");

                // Set up suggested Keyspace menu
                Section("Suggested Contacts");
                for (var j = 0; j < activeKeySpaceSuggestions.length; j++) {
                    (function (pgp_id_public, user_id) {
                        Item("UI.MENU keyspace " + pgp_id_public + " " + user_id + " new", user_id);
                    })(activeKeySpaceSuggestions[j][0], activeKeySpaceSuggestions[j][1]);
                }

                Item("UI.MENU keyspace", "(" + userIDList.length + ") Suggestions");

                Done();
            }
        );
    }

    function getKeySpaceMenu(args, Section, Item, Done) {
        if(args.length === 0)
            throw new Error("Invalid Args");

        var pgp_id_public = args[0];
        var user_id = (args[1] || 'unsubscribed').toLowerCase();
        var existing = (args[2] || 'new').toLowerCase();

        Section("Contact: " + user_id);
        Item("UI.MENU keyspace " + pgp_id_public, "Public Key ID: " + pgp_id_public);
        Item("KEYSPACE.INFO " + pgp_id_public, "KeySpace Information");
        Item("KEYSPACE.MESSAGE " + pgp_id_public, "Private Message");
        Item("GET http://" + pgp_id_public + ".ks/", "Browse KeySpace");

        if(existing === 'existing')
            Item("KEYSPACE.DELETE " + pgp_id_public, "Delete (remove from client)");
        else
            Item("GET http://" + pgp_id_public + ".ks/public/id", "Add (Request Public key)");

        Done();
    }

    function getChannelsMenu(args, Section, Item, Done) {
        if(args.length > 0) {
            return getChannelMenu(args, Section, Item, Done);
        }

        self.module = {exports: {}};
        importScripts("client/subscriptions/client-subscriptions.js");
        var ClientSubscriptions = self.module.exports.ClientSubscriptions;

        // List all subscribed channels
        var channelList = [];
        ClientSubscriptions.searchChannelSubscriptions(null, null,
            function(channelName, mode, argString) {
                if(channelList.indexOf(channelName) === -1)
                    channelList.push(channelName);
            });

        Section("Active Subscriptions");

        // Add each to the active menu
        for (var i = 0; i < channelList.length; i++) {
            (function (channelName) {
                Item("UI.MENU channel " + channelName + " subscribed", channelName);
            })(channelList[i]);
        }

        Item("UI.MENU channel", "(" + channelList.length + ") Subscriptions");

        // Set up suggested Channel menu
        Section("Suggested Channels");

        for (var j = 0; j < activeChannelSuggestions.length; j++) {
            (function (channelName) {
                Item("UI.MENU channel " + channelName, channelName);
            })(activeChannelSuggestions[j][0]);
        }

        Item("UI.MENU channel", "(" + channelList.length + ") Suggestions");

        Done();
    }

    function getChannelMenu(args, Section, Item, Done) {
        if(args.length === 0)
            throw new Error("Invalid Args");

        var channelName = args[0];
        var status = (args[1] || 'unsubscribed').toLowerCase();

        Section("Channel Menu: " + channelName);
        if(status && status.toLowerCase() === 'subscribed') {
            Item("CHANNEL.UNSUBSCRIBE.EVENT " + channelName, "Unsubscribe");

        } else {
            Item("CHANNEL.SUBSCRIBE.EVENT " + channelName, "Subscribe");
        }
        Item("CHANNEL.CHAT " + channelName, "Join Chat");
        Item("CHANNEL.AUDIO " + channelName, "Audio Feed");
        Item("CHANNEL.VIDEO " + channelName, "Video Feed");
        Item("CHANNEL.INFO " + channelName, "Channel Information");
        Done();
    }


    function getCommandsMenu(args, Section, Item, Done) {
        Section("Recent Commands");

        Section("Suggested Commands");
        Item("UI.CONTACTS", "Show <span class='command'>Contact</span> List");
        Item("CHANNEL.SEARCH", "<span class='command'>Subscribe</span> to Channels");
        Item("KEYSPACE.SEARCH", "<span class='command'>Search</span> for new Contacts");
        Item("PGP.KEYGEN", "<span class='command'>KeyGen</span> a new PGP Identity");
        Item("PGP.MANAGE", "<span class='command'>Manage</span> your PGP Identities");
        Item("KEYSPACE.FEED", "View your <span class='command'>Feed</span>");
        Item("KEYSPACE.PUT", "<span class='command'>Create</span> KeySpace Content");
        Item("ABOUT", "<span class='command'>About</span> &#8475;elay");

        Done();
    }

})();
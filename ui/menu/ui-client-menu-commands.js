/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    var SEARCH_TIMEOUT = 3000;
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

            switch(type) {
                case "keyspace":

                    // Fetch all Private Key Keyspace Subscriptions (Accounts)
                    var accountList = ClientSubscriptions.getAuthorizedKeySpaces().slice();
                    ClientSubscriptions.searchKeySpaceSubscriptions(null, null,
                        function(pgp_id_public, mode, argString) {
                            if(accountList.indexOf(pgp_id_public.toUpperCase()) === -1)
                                accountList.push(pgp_id_public.toUpperCase());
                        }
                    );

                    // Remove known contacts
                    for(var i1=0; i1<activeResults.length; i1++) {
                        activeResults[i1] = activeResults[i1].split(";");
                        if(accountList.indexOf(activeResults[i1][0].toUpperCase()))
                            activeResults.splice(i1--, 1);
                    }

                    activeKeySpaceSuggestions = activeResults;
                    break;

                case "channel":
                    for(var i2=0; i2<activeResults.length; i2++) {
                        activeResults[i2] = activeResults[i2].split(";");
                    }
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
        var match = /^(?:ui\.)?menu(?:\.(?:render|html))?\s*([\s\S]*)$/i.exec(commandString);
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
        Item("UI.MENU channel", "<span class='command'>Channel</span> Subscriptions");
        Item("UI.MENU keyspace", "<span class='command'>Contact</span> List");
        Item("UI.MENU command", "<span class='command'>Command</span> Menu");

        if(args.length > 0) {
            Item("UI.MENU", "Go back to main <span class='command'>menu</span>");
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
        Item("ABOUT", "<span class='command'>About</span> Relay");

        Done();

    }

    var lastKeySpaceSearch = null;
    function getKeySpacesMenu(args, Section, Item, Done) {
        if(args.length > 0) {
            return getKeySpaceMenu(args, Section, Item, Done);
        }

        if(!lastKeySpaceSearch || lastKeySpaceSearch < Date.now() - SEARCH_TIMEOUT) {
            lastKeySpaceSearch = Date.now();
            console.info("Requesting KeySpace Search...");
            Client.execute("KEYSPACE.SEARCH.LIST");
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

                Section("Active Contacts (" + userIDList.length + ")");

                // Add each to the active menu
                for (var i = 0; i < userIDList.length; i++) {
                    (function (pgp_id_public, user_id) {
                        Item("UI.MENU keyspace " + pgp_id_public + " " + user_id + " existing",
                            user_id + " [<span class='pgp-id-public'>" + pgp_id_public + "</span>]");
                    })(userIDList[i][0], userIDList[i][1]);
                }

                Section("Suggested Contacts (" + activeKeySpaceSuggestions.length + ")");

                // Set up suggested Keyspace menu
                for (var j = 0; j < activeKeySpaceSuggestions.length; j++) {
                    (function (pgp_id_public, user_id) {
                        if(idList.indexOf(pgp_id_public.toUpperCase()) >= 0)
                            return;
                        Item("UI.MENU keyspace " + pgp_id_public + " " + user_id + " new",
                            "<span class='command'>Add</span> " +
                            user_id + " [<span class='pgp-id-public'>" + pgp_id_public + "</span>]");
                    })(activeKeySpaceSuggestions[j][0], activeKeySpaceSuggestions[j][1]);
                }

                Done();
            }
        );
    }

    function getKeySpaceMenu(args, Section, Item, Done) {
        if(args.length === 0)
            throw new Error("Invalid Args");

        var pgp_id_public = args[0];
        var user_id = (args[1] || '[N/A]').toLowerCase();
        var existing = (args[2] || 'new').toLowerCase();

        if(existing === 'existing')
            Section("Contact: " + user_id + " [<span class='pgp-id-public'>" + pgp_id_public + "</span>]");
        else
            Section("New Contact: " + user_id + " [<span class='pgp-id-public'>" + pgp_id_public + "</span>]");

        //Item("UI.MENU keyspace " + pgp_id_public, "Public Key ID: <span class='pgp-id-public'>" + pgp_id_public + "</span>");
        Item("KEYSPACE.MESSAGE " + pgp_id_public, "Private <span class='command'>Message</span>");

        if(existing === 'existing')
            Item("PGP.DELETE " + pgp_id_public, "<span class='command'>Delete</span> (remove from client)");
        else
            Item("GET http://" + pgp_id_public + ".ks/public/id", "<span class='command'>Add</span> (Request Public key)");

        Item("GET http://" + pgp_id_public + ".ks/", "<span class='command'>Browse</span> KeySpace (Coming Soon)");
        Item("KEYSPACE.INFO " + pgp_id_public, "<span class='command'>KeySpace</span> Information (Coming Soon)");

        Done();
    }

    var lastChannelSearch = null;
    function getChannelsMenu(args, Section, Item, Done) {
        if(args.length > 0) {
            return getChannelMenu(args, Section, Item, Done);
        }

        if(!lastChannelSearch || lastChannelSearch < Date.now() - SEARCH_TIMEOUT) {
            lastChannelSearch = Date.now();
            console.info("Requesting Channel Search...");
            Client.execute("CHANNEL.SEARCH.LIST");
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

        Section("Active Subscriptions (" + channelList.length + ")");

        // Add each to the active menu
        for (var i = 0; i < channelList.length; i++) {
            (function (channelName) {
                Item("UI.MENU channel " + channelName + " subscribed", channelName);
            })(channelList[i]);
        }

        // Set up suggested Channel menu
        Section("Suggested Channels (" + activeChannelSuggestions.length + ")");

        for (var j = 0; j < activeChannelSuggestions.length; j++) {
            (function (channelName) {
                Item("UI.MENU channel " + channelName,
                    "<span class='command'>Subscribe</span> " + channelName);
            })(activeChannelSuggestions[j][0]);
        }

        Done();
    }

    function getChannelMenu(args, Section, Item, Done) {
        if(args.length === 0)
            throw new Error("Invalid Args");

        var channelName = args[0];
        var status = (args[1] || 'unsubscribed').toLowerCase();

        Section("Channel: " + channelName);
        if(status && status.toLowerCase() === 'subscribed') {
            Item("CHANNEL.UNSUBSCRIBE.EVENT " + channelName, "Unsubscribe " + channelName);

        } else {
            Item("CHANNEL.SUBSCRIBE.EVENT " + channelName, "Subscribe " + channelName);
        }
        Item("CHANNEL.CHAT " + channelName, "Join Chat");
        Item("CHANNEL.AUDIO " + channelName, "Audio Feed (Coming Soon)");
        Item("CHANNEL.VIDEO " + channelName, "Video Feed (Coming Soon)");
        Item("CHANNEL.INFO " + channelName, "Channel Information");
        Done();
    }


    function getCommandsMenu(args, Section, Item, Done) {
        Section("Recent Commands");

        var recentCommands = ClientWorkerThread.getCommandHistory();

        // TODO: recent commands aren't finished yet
        // Add each to the active menu
        for (var i = 0; i < recentCommands.length; i++) {
            (function (commandString) {
                var parts = commandString.split(' ');
                var part1 = parts.shift();
                var part2 = parts.join(' ');
                Item(commandString, '<span class="command">' + part1 + "</span>" + (part2 ? ' ' + part2 : ''));
            })(recentCommands[i]);
        }

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
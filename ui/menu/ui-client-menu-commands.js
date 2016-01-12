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
            var match = /^(?:ui\.)?menu(?:\.(list|render))?\s*(\S*)/i.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var subCommand = (match[1] || 'render').toLowerCase();
            var menuCommand = match[2];

            getMenu(menuCommand,
                function(responseMenu) {

                    switch(subCommand) {
                        case 'render':
                            renderNavMenu(responseMenu,
                                function(html) {
                                    ClientWorkerThread.render(html);
                                }
                            );
                            break;

                        case 'list':
                            var responseString = "UI.MENU.LIST " + menuCommand;

                            for(var menuKey in responseMenu) {
                                if(responseMenu.hasOwnProperty(menuKey)) {
                                    var menuItem = responseMenu[menuKey];
                                    if(!Array.isArray(menuItem))
                                        menuItem = [menuItem];
                                    responseString += "\n" + menuKey + " " + menuItem[0];
                                }
                            }

                            console.log("Menu ", responseString);
                            ClientWorkerThread.processResponse(responseString);
                            break;
                    }
                }
            );

            return true;
        }

        function searchResultsListener(responseString) {
            var match = /^event (keyspace|channel)\.search\.results([\s\S]+)$/im.exec(responseString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var activeResults = responseString.split("\n");
            for(var i=0; i<activeResults.length; i++)
                activeResults[i] = activeResults[i].split(' ');
            var stats = activeResults.shift().trim().split(" ");

            switch(type) {
                case 'keyspace':
                    activeKeySpaceSuggestions = activeResults;
                    break;

                case 'channel':
                    activeChannelSuggestions = activeResults;
                    break;
            }

            return false;
        }

    };

    function renderNavMenu(menu, callback) {

        var html_menu = '';

        console.log(menu);

        for(var menuKey in menu) {
            if(menu.hasOwnProperty(menuKey)) {
                var menuItem = menu[menuKey];
                if(!Array.isArray(menuItem))
                    menuItem = [menuItem];

                // TODO: Section
                if(!menuItem[0]) {
                    html_menu +=
                        "</ul>" +
                        "<ul>";

                } else if(!menuItem[1]) {
                    html_menu +=
                        "<lh>" + menuItem[0] + "</lh>";

                } else {
                    html_menu +=
                        "<li>" +
                            "<a href='javascript:Client.execute(\"UI.MENU " + menuKey + "\");'>" +
                                menuItem[0] +
                            "</a>" +
                        "</li>"
                }

            }
        }

        var TEMPLATE_URL = 'ui/menu/render/ui-menu.html';
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if (xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        callback(
            xhr.responseText
                .replace(/{\$html_menu}/gi, html_menu)
        );

    }


    function executeMenuCommand(menuCommand, menu, menuCallback) {
        if(!menuCommand) {
            // Return entire menu
            menuCallback(menu);
            return true;
        }

        if(typeof menu[menuCommand] === 'undefined') {

            // TODO find deep menu command

            console.error("Invalid Menu Command: ", menuCommand, menu);
            // Return entire menu
            menuCallback(menu);
            return false;
        }

        var menuItem = menu[menuCommand];
        if(!Array.isArray(menuItem))
            menuItem = [menuItem];
        var menuItemCommand = menuItem[1];
        if(!menuItemCommand)  {
            // Return menu
            menuCallback(menu);

        } else if(typeof menuItemCommand === 'function') {
            // Call Sub-Menu
            console.info("Selected Menu Item Command is a SubMenu: ", menuItemCommand);
            menuItemCommand(menuCommand, menuCallback);

        } else {
            console.info("Selected Menu Item Command is a Command: ", menuItemCommand);
            Client.execute(menuItemCommand);

            // Build and return Success Menu
            var successMenu = {
                'k':        ['Contacts', getKeySpaceMenu],
                'c':        ['Channels', getChannelsMenu],
                'x':        ['Commands', getCommandsMenu],
                //'00':       '',
                '01':       'Command was executed:',
                '02':       menuItemCommand,
                '':         ['Done', getMenu]
            };
            menuCallback(successMenu);
        }
        return true;
    }

    function getMenu(menuCommand, menuCallback) {
        var menu = {
            '00':       ['Menu Categories'],
            'k':        ['Contact List', getKeySpaceMenu],
            'c':        ['Channel Subscriptions', getChannelsMenu],
            'x':        ['Command Menu', getCommandsMenu],

            '01':        '',
            '02':       ['Recent Commands'],
            'u.c':      ['Contact List', 'UI.CONTACTS'],
            'k.s':      ['Search for Contacts', 'KEYSPACE.SEARCH'],
            'p.k':      ['Create a new PGP Identity', 'PGP.KEYGEN'],
            'p.m':      ['Manage your PGP Identities', 'PGP.MANAGE'],
            'k.f':      ['View your Feed', 'KEYSPACE.FEED'],
            'k.p':      ['Create KeySpace Content', 'KEYSPACE.PUT'],
            'u.a':      ['About &#8475;elay', 'ABOUT']

        };

        executeMenuCommand(menuCommand, menu, menuCallback);
    }

    function getKeySpaceMenu(menuCommand, menuCallback) {
        var menu = {
            'k':        'Contacts',
            'c':        ['Channels', getChannelsMenu],
            'x':        ['Commands', getCommandsMenu],
            '':         ['Go Back', getKeySpaceMenu],
            '00':        '',
            '01':        'Active Contacts'
        };

        self.module = {exports: {}};
        importScripts('client/subscriptions/client-subscriptions.js');
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
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        // Fetch all User IDs for this public key list
        KeySpaceDB.fetchAllPublicKeyUserIDs(idList,
            function(userIDList) {

                // Add each to the active menu
                for (var i = 0; i < userIDList.length; i++) {
                    (function (pgp_id_public, user_id) {
                        var menuKey = 'k.a.' + pgp_id_public.toLowerCase();
                        menu[menuKey] = [user_id,
                            function (menuCommand, menuCallback) {
                                var subMenu = {
                                    'c': ['Channels', getChannelsMenu],
                                    'x': ['Commands', getCommandsMenu],
                                    'k': ['Go Back', getKeySpaceMenu],
                                    '00': '',
                                    '01': user_id + " [" + pgp_id_public + "]"
                                };
                                subMenu[menuKey + '.m'] = ['Private Message', "KEYSPACE.MESSAGE " + pgp_id_public];
                                subMenu[menuKey + '.d'] = ['Delete (remove from client)', "KEYSPACE.DELETE " + pgp_id_public];

                                executeMenuCommand(menuCommand, subMenu, menuCallback);
                            }
                        ];
                    })(userIDList[i][0], userIDList[i][1]);
                }


                // Set up suggested Keyspace menu
                menu['02'] = '';
                menu['03'] = 'Suggested Contacts';
                for (var j = 0; j < activeKeySpaceSuggestions.length; j++) {
                    (function (pgp_id_public, user_id) {
                        var menuKey = 'k.a.' + pgp_id_public.toLowerCase();
                        menu[menuKey] = [user_id,
                            function (menuCommand, menuCallback) {
                                var subMenu = {
                                    'c': ['Channels', getChannelsMenu],
                                    'x': ['Commands', getCommandsMenu],
                                    'k': ['Go Back', getKeySpaceMenu],
                                    '00': '',
                                    '01': user_id + " [" + pgp_id_public + "]"
                                };

                                subMenu[menuKey + '.i'] = ['KeySpace Information', "KEYSPACE.INFO " + pgp_id_public];
                                subMenu[menuKey + '.m'] = ['Private Message', "KEYSPACE.MESSAGE " + pgp_id_public];
                                subMenu[menuKey + '.a'] = ['Add (Request Public key)', "GET http://" + pgp_id_public + ".ks/public/id "];
                                subMenu[menuKey + '.b'] = ['Browse KeySpace', "GET http://" + pgp_id_public + ".ks/"];

                                executeMenuCommand(menuCommand, subMenu, menuCallback);
                            }
                        ];
                    })(activeChannelSuggestions[j][0], activeChannelSuggestions[j][1]);
                }

                executeMenuCommand(menuCommand, menu, menuCallback);
            }
        );
    }

    function getChannelsMenu(menuCommand, menuCallback) {
        var menu = {
            'k':        ['Contacts', getKeySpaceMenu],
            'c':        'Channels',
            'x':        ['Commands', getCommandsMenu],
            '':         ['Go Back', getKeySpaceMenu],
            '00':        '',
            '01':        'Active Contacts'
        };


        // List all subscribed channels
        var channelList = [];
        ClientSubscriptions.searchChannelSubscriptions(null, null,
            function(channelName, mode, argString) {
                if(channelList.indexOf(channelName) === -1)
                    channelList.push(channelName);
            });


        // Add each to the active menu
        for (var i = 0; i < channelList.length; i++) {
            (function (channelName) {
                var menuKey = 'k.a.' + channelName.toLowerCase();
                menu[menuKey] = [channelName,
                    function (menuCommand, menuCallback) {
                        var subMenu = {
                            'c': ['Channels', getChannelsMenu],
                            'x': ['Commands', getCommandsMenu],
                            'k': ['Go Back', getKeySpaceMenu],
                            '00': '',
                            '01': channelName
                        };
                        subMenu[menuKey + '.c'] = ['Chat', "CHANNEL.CHAT " + channelName];
                        subMenu[menuKey + '.a'] = 'Audio';
                        subMenu[menuKey + '.v'] = 'Video';
                        subMenu[menuKey + '.u'] = ['Unsubscribe', "CHANNEL.UNSUBSCRIBE.EVENT " + channelName];

                        executeMenuCommand(menuCommand, subMenu, menuCallback);
                    }
                ];
            })(channelList[i]);
        }

        executeMenuCommand(menuCommand, menu, menuCallback);
    }

    function getCommandsMenu(menuCommand, menuCallback) {
        var menu = {
            'k':        ['Contacts', getKeySpaceMenu],
            'c':        ['Channels', getChannelsMenu],

            '0':        [''],
            'x':        'Commands',
            'u.c':      ['Contact List', 'UI.CONTACTS'],
            'k.s':      ['Search for Contacts', 'KEYSPACE.SEARCH'],
            'p.k':      ['Create a new PGP Identity', 'PGP.KEYGEN'],
            'p.m':      ['Manage your PGP Identities', 'PGP.MANAGE'],
            'k.f':      ['View your Feed', 'KEYSPACE.FEED'],
            'k.p':      ['Create KeySpace Content', 'KEYSPACE.PUT'],
            'u.a':      ['About &#8475;elay', 'ABOUT']
        };

        executeMenuCommand(menuCommand, menu, menuCallback);
    }

})();
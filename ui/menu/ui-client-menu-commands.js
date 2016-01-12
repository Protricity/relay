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
            var match = /^(?:ui\.)?menu\s+(\S+)/i.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var menuCommand = match[1];

            getMenu(menuCommand,
                function() {
                }
            )

        } ClientWorkerThread.addResponse(searchResultsListener, true);

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

        function executeMenuItemCommand(menuItemCommand) {

        }


        function getMenu(menuCommand, menuCallback) {
            var menu = {
                'k':        ['Contacts', getKeySpaceMenu],
                'c':        ['Channels', getChannelsMenu],
                'x':        ['Commands', getCommandsMenu],
                '00':        '',
                'x.u.k':    ['View Contacts List', 'UI.CONTACTS'],
                'x.k.s':    ['Search for People', 'KEYSPACE.SEARCH'],
                'x.p.k':    ['Create a new PGP Identity', 'PGP.KEYGEN'],
                'x.p.m':    ['Manage your PGP Identities', 'PGP.MANAGE'],
                'x.k.p':    ['PUT to your KeySpace', 'KEYSPACE.PUT'],
                'u.a':      ['About &#8475;elay', 'ABOUT']
            };

            if(menuCommand) {
                if(typeof menu[menuCommand] === 'undefined') {
                    console.error("Invalid Menu Command: ", menuCommand, menu);
                    // Return entire menu
                    menuCallback(menu);
                    return;
                }
                var menuItem = menu[menuCommand];
                var menuItemCommand = menuItem[1];
                if(typeof menuItemCommand === 'function') {
                    // Call Sub-Menu
                    console.info("Selected Menu Item Command is a SubMenu: ", menuItemCommand);
                    menuItemCommand(menuCommand, menuCallback);

                } else {
                    console.info("Selected Menu Item Command is a Command: ", menuItemCommand);
                    ClientWorkerThread.execute(menuItemCommand);

                    // Build and return Success Menu
                    var successMenu = {
                        '':         ['Done', getMenu],
                        'c':        ['Go back to Contacts', getKeySpaceMenu],
                        '00':        '',
                        '01':        'Command was executed:',
                        '02':        menuItemCommand
                    };
                    menuCallback(successMenu);
                }

            } else {

                // Return entire menu
                menuCallback(menu);
            }

        }

        function getKeySpaceMenu(menuCommand, menuCallback) {
            var menu = {
                'k':        'Contacts',
                'c':        ['Channels', getChannelsMenu],
                'x':        ['Commands', getCommandsMenu],
                '':         ['Go Back', getKeySpaceMenu],
                '00':        '',
                '01':        'Active Channels'
            };

            self.module = {exports: {}};
            importScripts('client/subscriptions/client-subscriptions.js');
            var ClientSubscriptions = self.module.exports.ClientSubscriptions;

            // Fetch all Keyspace Subscriptions (Contacts)
            var idList = [];
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
                    for(var i=0; i<userIDList.length; i++)
                        (function(pgp_id_public, user_id){
                            var menuKey = 'k.a.' + pgp_id_public.toLowerCase();
                            if(menuCommand === menuKey)
                                then 
                            menu[menuKey] = [user_id,
                                function(subMenuCallback) {
                                    var menu = {
                                        'c':        ['Channels', getChannelsMenu],
                                        'x':        ['Commands', getCommandsMenu],
                                        'k':        ['Go Back', getKeySpaceMenu],
                                        '00':        '',
                                        '01':        user_id + " [" + pgp_id_public + "]"
                                    };
                                    menu[menuKey + '.m'] =  ['Private Message', "KEYSPACE.MESSAGE " + pgp_id_public];
                                    menu[menuKey + '.m'] =  ['Delete (remove from client)', "KEYSPACE.DELETE " + pgp_id_public];

                                    subMenuCallback(menu);
                                }
                            ];
                        })(userIDList[0], userIDList[1]);


                    // Set up suggested Keyspace menu
                    menu['02'] = '';
                    menu['03'] = 'Suggested Channels';
                    for(var j=0; j<activeKeySpaceSuggestions.length; j++)
                        (function (pgp_id_public, user_id) {
                            menu['k.s.' + pgp_id_public] = [user_id,
                                function (subMenuCallback) {
                                    var menu = {
                                        'c': ['Channels', getChannelsMenu],
                                        'x': ['Commands', getCommandsMenu],
                                        'k': ['Go Back', getKeySpaceMenu],
                                        '00': '',
                                        'k.s.i': ['KeySpace Information', "KEYSPACE.INFO " + pgp_id_public],
                                        'k.s.m': ['Private Message', "KEYSPACE.MESSAGE " + pgp_id_public],
                                        'p.s.a': ['Add (Request Public key)', "GET http://" + pgp_id_public + ".ks/public/id "],
                                        'p.s.g': ['Browse KeySpace', "GET http://" + pgp_id_public + ".ks/ "]
                                    };

                                    subMenuCallback(menu);
                                }
                            ];
                        })(activeChannelSuggestions[j][0], activeChannelSuggestions[j][1]);

                    menuCallback(menu);

                }
            );


        }

        function getChannelsMenu(callback) {
            var menu = {
                'k':        ['Contacts', getKeySpaceMenu],
                'x':        ['Commands', getCommandsMenu],
                'u.a':      ['ABOUT', 'About &#8475;elay'],
                '0':        ['-']
            };

            callback(menu);
        }

        function getCommandsMenu(callback) {
            var menu = {
                'k':        ['Contacts', getKeySpaceMenu],
                'c':        ['Channels', getChannelsMenu],
                'u.a':      ['ABOUT', 'About &#8475;elay'],
                '0':        ['-']
            };

            callback(menu);
        }

    };

})();
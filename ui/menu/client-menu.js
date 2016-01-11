/**
 * Created by ari on 10/5/2015.
 */

if (!module) var module = {};
if (!module.exports) module.exports = {};

(function() {
    module.exports.getMenu = getMenu;
    module.exports.getKeySpaceMenu = getKeySpaceMenu;
    module.exports.getChannelsMenu = getChannelsMenu;
    module.exports.getCommandsMenu = getCommandsMenu;


    function getMenu(callback) {
        callback([
            ['Contacts', getKeySpaceMenu],
            ['Channels', getChannelsMenu],
            ['Commands', getCommandsMenu],
            ['-'],
            ['View Contacts List', 'UI.CONTACTS'],
            ['Search for People', 'KEYSPACE.SEARCH'],
            ['Create a new PGP Identity', 'PGP.KEYGEN'],
            ['Manage your PGP Identities', 'PGP.MANAGE'],
            ['PUT to your KeySpace', 'PGP.PUT'],
            ['About &#8475;elay', 'ABOUT'],
            ['KEYSPACE.SEARCH', 'Search for People'],
            ['PGP.KEYGEN', 'Create a new PGP Identity'],
            ['PGP.MANAGE', 'Manage your PGP Identities'],
            ['KEYSPACE.FEED', 'View Content Feed'],
            ['PGP.PUT', 'PUT to your KeySpace'],
            ['ABOUT', 'About &#8475;elay']

        ]);
    }

    function getKeySpaceMenu(callback) {
        callback([
            ['Channels', getChannelsMenu],
            ['Commands', getCommandsMenu],
            ['ABOUT', 'About &#8475;elay']
        ]);
    }

    function getChannelsMenu(callback) {
        callback([
            ['Contacts', getKeySpaceMenu],
            ['Commands', getCommandsMenu],
            ['ABOUT', 'About &#8475;elay']
        ]);
    }

    function getCommandsMenu(callback) {
        callback([
            ['Contacts', getKeySpaceMenu],
            ['Channels', getChannelsMenu],
            ['ABOUT', 'About &#8475;elay']
        ]);
    }
})();
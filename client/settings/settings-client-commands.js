/**
 * Created by ari on 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientSettingsCommands = function (ClientWorkerThread) {

        ClientWorkerThread.addCommand(settingsAutoStartCommand);

        function settingsAutoStartCommand(commandString) {
            var match = /^(?:settings\.)?(autorun|onconnect|ondisconnect)/im.exec(commandString);
            if (!match)
                return false;

            var subCommand = match[1].toLowerCase();

            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;

            // TODO: on connect? or on client start?
            // Query Settings for Auto Run Scripts
            SettingsDB.getAllSettings(subCommand + ":*", function(eventSettings) {
//                 console.log("Settings: ", settingsSettings);
                if(eventSettings
                    && typeof eventSettings.commands !== 'undefined') {
                    var commands = eventSettings.commands;
                    for(var i=0; i<commands.length; i++) {
//                         console.info(subCommand.toUpperCase() + ": " + commands[i]);
                        ClientWorkerThread.execute(commands[i]);
                    }
                }
            });


            return true;
        }
    };
})();
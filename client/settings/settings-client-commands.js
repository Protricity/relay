/**
 * Created by ari on 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientSettingsCommands = function (ClientWorkerThread) {

        ClientWorkerThread.addCommand(settingsAutoStartCommand);

        function settingsAutoStartCommand(commandString) {
            var match = /^(?:settings\.)?autorun/im.exec(commandString);
            if (!match)
                return false;

            console.log("TODO: finish autojoin");

            self.module = {exports: {}};
            importScripts('client/settings/settings-db.js');
            var SettingsDB = self.module.exports.SettingsDB;

            // Query Settings for Auto Run Scripts
            SettingsDB.getAllSettings("autorun:*", function(autorunSettings) {
//                 console.log("Settings: ", settingsSettings);
                if(typeof autorunSettings.commands !== 'undefined') {
                    var commands = autorunSettings.commands;
                    for(var i=0; i<commands.length; i++) {
                        console.info("AUTORUN: " + commands[i]);
                        ClientWorkerThread.execute(commands[i]);
                    }
                }
            });


            return true;
        }
    };
})();
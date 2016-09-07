/**
 * Created by ari on 11/20/2015.
 *
 * This will eventually become a Relay app for playing music
 */

if(typeof module === 'object') (function() {
    module.exports.initClientAppMusicPlayCommands = function (Client) {

        Client.addCommand(playCommand);

        /**
         *
         * @param commandString PLAY
         */
        function playCommand(commandString) {
            var match = /^play/im.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('app/music/play/window/play-window.js');
            self.module.exports.renderPlayWindow(commandString, function (html) {
                Client.render(html);
            });

            return true;
        }
    };
})();
/**
 * Created by ari on 11/20/2015.
 *
 * This will eventually become a Relay app for publishing music
 */

if(typeof module === 'object') (function() {
    module.exports.initClientAppMusicPublishCommands = function (Client) {

        Client.addCommand(publishCommand);

        /**
         *
         * @param commandString PUBLISH
         */
        function publishCommand(commandString) {
            var match = /^publish/im.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('app/music/publish/window/publish-window.js');
            self.module.exports.renderPublishWindow(commandString, function (html) {
                Client.render(html);
            });

            return true;
        }
    };
})();
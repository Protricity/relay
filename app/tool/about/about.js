/**
 * Created by ari on 10/30/2015.
 *
 * This is an about-window script for Relay
 */

if(typeof module === 'object') (function() {
    module.exports.initClientAppAboutCommands = function (Client) {

        Client.addCommand(aboutCommand);

        /**
         *
         * @param commandString ABOUT
         */
        function aboutCommand(commandString) {
            var match = /^about/im.exec(commandString);
            if (!match)
                return false;

            self.exports = {};
            self.module = {exports: {}};
            importScripts('app/tool/about/window/about-window.js');
            var renderExports = self.module.exports;

            renderExports.renderAboutWindow(commandString, function (html) {
                Client.render(html);
            });

            return true;
        }
    };
})();
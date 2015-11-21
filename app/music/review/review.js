/**
 * Created by ari on 11/20/2015.
 *
 * This will eventually become a Relay app for reviewing music
 */

if(typeof module === 'object') (function() {
    module.exports.initClientAppMusicReviewCommands = function (Client) {

        Client.addCommand(reviewCommand);

        /**
         *
         * @param commandString REVIEW
         */
        function reviewCommand(commandString) {
            var match = /^review/im.exec(commandString);
            if (!match)
                return false;

            self.module = {exports: {}};
            importScripts('app/music/review/window/review-window.js');
            self.module.exports.renderReviewWindow(commandString, function (html) {
                Client.render(html);
            });

            return true;
        }
    };
})();
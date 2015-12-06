/**
 * Created by ari on 7/2/2015.
 */

if(typeof module === 'object') (function() {
    module.exports.initClientKSFeedCommands = function (Client) {

        Client.addCommand(feedCommand);

        /**
         *
         * @param commandString FEED --id [public key id] --path [path prefix]
         */
        function feedCommand(commandString) {
            var match = /^feed/im.exec(commandString);
            if (!match)
                return false;

            var feedEndTime = Date.now();

            self.module = {exports: {}};
            importScripts('keyspace/feed/render/ks-feed.js');
            var renderExports = self.module.exports;

            renderExports.renderFeedContainer(commandString, function (html) {
                Client.render(html);
            });

            return true;
        }
    };
})();
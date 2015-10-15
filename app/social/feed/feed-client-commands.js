/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var MS_DAY = 24 * 60 * 60 * 1000;

    Client.addCommand(feedCommand);


    /**
     *
     * @param commandString FEED --id [public key id] --path [path prefix]
     */
    function feedCommand(commandString) {
        var match = /^feed/im.exec(commandString);
        if(!match)
            return false;

        var feedEndTime = Date.now();
        var feedStartTime = feedEndTime - MS_DAY;

        self.exports = {};
        self.module = {exports: {}};
        importScripts('app/social/feed/render/feed-templates.js');
        var renderExports = self.module.exports;

        renderExports.renderFeedContainer(commandString, function(html) {
            Client.render(html);
        });

        getKeySpaceDB().queryContentFeed(
            [feedStartTime, feedEndTime],
            function(err, data) {
                console.info("CONTENT: ", err, data);
                if(err)
                    throw new Error(err);
                if(data)
                    renderExports.renderFeedEntry(data, function(html) {
                        Client.appendChild("feed-entries:", html);
                    });
            });
        return true;
    }

    function getKeySpaceDB() {
        if(typeof self.KeySpaceDB === 'undefined') {
            if(typeof importScripts === "function")
                importScripts('ks/ks-db.js');
            else
                self.KeySpaceDB = require('./ks-db.js').KeySpaceDB;
        }
        return self.KeySpaceDB;
    }

})();

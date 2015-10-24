/**
 * Created by ari on 7/2/2015.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSFeedCommands = function(Client) {
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
        importScripts('ks/feed/render/feed-templates.js');
        var renderExports = self.module.exports;

        renderExports.renderFeedContainer(commandString, function(html) {
            Client.render(html);
        });

        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        KeySpaceDB.queryContentFeed(
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


};
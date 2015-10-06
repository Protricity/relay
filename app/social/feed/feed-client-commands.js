/**
 * Created by ari on 7/2/2015.
 */
//if(!exports) var exports = {};
(function() {

    var MS_DAY = 24 * 60 * 60 * 1000;

    //var PATH_PREFIX_FEED = 'feed:';

    var db = null;

    importScripts('app/social/feed/feed-templates.js');

    /**
     *
     * @param commandString FEED --id [public key id] --path [path prefix]
     */
    Client.addCommand(feedCommand);
    function feedCommand(commandString) {
        var match = /^feed/im.exec(commandString);
        if(!match)
            return false;

        var feedEndTime = Date.now();
        var feedStartTime = feedEndTime - MS_DAY;

        Templates.feed.container(commandString, function(html) {
            Client.postResponseToClient("RENDER.REPLACE feed: " + html);
        });

        getKeySpaceDB().queryContentFeed(
            [feedStartTime, feedEndTime],
            function(err, data) {
                console.info("CONTENT: ", err, data);
                if(err)
                    throw new Error(err);
                if(data)
                    Templates.feed.entry(data, function(html) {
                        Client.postResponseToClient("RENDER feed-entries: " + html);
                    });
            });
        return true;
    }

//    function feedCommandOld(commandString) {
//        var match = /^feed\s*(\S*)\s*(\S*)/im.exec(commandString);
//        if(!match)
//            return false;
//
//        var publicKeyID = match[1] || null;
//        var pathPrefix = match[2] || '~';
//
//        var keyID = publicKeyID.substr(publicKeyID.length - 8);
//
//        if(pathPrefix[0] === '~') {
//            pathPrefix = pathPrefix.substr(1);
//            if (!pathPrefix || pathPrefix[0] !== '/')
//                pathPrefix = '/' + pathPrefix;
//            pathPrefix = '/home/' + keyID + pathPrefix;
//            console.info("Re-routing ~ => " + pathPrefix);
//        }
//        pathPrefix = pathPrefix.toLowerCase();
//
//        var feedEndTime = Date.now();
//        var feedStartTime = feedEndTime - MS_DAY;
//
//        Templates.feed.container(pathPrefix, function(html) {
//            Client.postResponseToClient("LOG.REPLACE feed:" + pathPrefix + ' ' + html);
//        });
//
//        if(typeof KeySpaceDB !== 'function')
//            importScripts('ks/ks-db.js');
//
//        KeySpaceDB.queryContentFeedByID(
//            publicKeyID,
//            [feedStartTime, feedEndTime],
//            function(err, data) {
//                if(err)
//                    throw new Error(err);
//
//                Templates.feed.entry(data, function(html) {
//                    Client.postResponseToClient("LOG feed-entries:" + pathPrefix + " " + html);
//                });
//            });
//}

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

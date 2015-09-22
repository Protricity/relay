/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var MS_DAY = 24 * 60 * 60 * 1000;

    //var PATH_PREFIX_FEED = 'feed:';

    var db = null;

    importScripts('rest/feed/feed-templates.js');

    var feedNCounter = 0;
    var postFormNCounter = 0;
    /**
     *
     * @param commandString FEED [public key id] [path prefix]
     */
    Commands.add('feed', function (commandString) {
        var match = /^feed\s*(\S*)\s*(\S*)$/im.exec(commandString);

        var publicKeyID = match[1] || null;
        var pathPrefix = match[2] || '~';

        if(publicKeyID) {
            showFeed(publicKeyID);

        } else {
            if(typeof PGPDB !== 'function')
                importScripts('pgp/pgp-db.js');

            PGPDB.getDefaultPrivateKeyData(function (defaultPrivateKeyData) {
                if(!defaultPrivateKeyData)
                    throw new Error("No default PGP Identity found");
                showFeed(defaultPrivateKeyData.id_public);
            });
        }

        function showFeed(publicKeyID) {
            var keyID = publicKeyID.substr(publicKeyID.length - 8);

            if(pathPrefix[0] === '~') {
                pathPrefix = pathPrefix.substr(1);
                if (!pathPrefix || pathPrefix[0] !== '/')
                    pathPrefix = '/' + pathPrefix;
                pathPrefix = '/home/' + keyID + pathPrefix;
                console.info("Re-routing ~ => " + pathPrefix);
            }
            pathPrefix = pathPrefix.toLowerCase();

            var feedEndTime = Date.now();
            var feedStartTime = feedEndTime - MS_DAY;

            Templates.feed.container(pathPrefix, function(html) {
                Commands.postResponseToClient("LOG.REPLACE feed:" + pathPrefix + ' ' + html);
            });

            if(typeof RestDB !== 'function')
                importScripts('rest/rest-db.js');

            RestDB.queryContentFeedByID(
                publicKeyID,
                [feedStartTime, feedEndTime],
                function(data) {
                    Templates.feed.entry(data, function(html) {
                        Commands.postResponseToClient("LOG feed-entries:" + pathPrefix + " " + html);
                    });
                });
        }

    });

    //Commands.addResponse('feed', Commands.sendWithSocket);


})();

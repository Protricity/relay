/**
 * Created by ari on 9/16/2015.
 */

tagCallbacks['ks'] = function(tagString, callback) {
    var found = false;
    tagString.replace(/\{ks::index\s+([^}]+)}/i, function(tagString, pathString) {
        found = true;
        getKeySpaceDB().listURLIndex(pathString, function(urls) {
            var pathHTML = "<ul class='path-index'>";
            for(var i=0; i<urls.length; i++)
                pathHTML += "\t<li><a href='" + urls[i][0] + "'>" + urls[i][1] + "</a></li>";
            pathHTML += "</ul>";
            callback(pathHTML);
        });
    });

    if(!found) {
        console.warn("Could not find content for tag: " + tagString);
        callback("<span class='tag-error'>Tag content not found</span>");
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
};

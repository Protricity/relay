/**
 * Created by ari on 10/5/2015.
 */

if (!module) var module = {};
if (!module.exports) module.exports = {};

(function() {
    module.exports.renderKeySpaceTag = function(tagHTML, callback) {
        var match = /^\{ks::([^}\s]*)[^}]*}$/.exec(tagHTML);
        if(!match)
            throw new Error("Invalid Tag: " + tagHTML);

        var subTag = (match[1] || '').toLowerCase();
        switch(subTag) {
            case 'index':
                renderKeySpaceIndexTag(tagHTML, callback);
                return true;

            default:
                throw new Error("Invalid Tag: " + tagHTML);
        }
    };

    function renderKeySpaceIndexTag(tagHTML, callback) {
        if(typeof self.KeySpaceDB === 'undefined') {
            if(typeof importScripts === "function")
                importScripts('keyspace/ks-db.js');
            else
                self.KeySpaceDB = require('../ks-db.js').KeySpaceDB;
        }

        var found = false;
        tagHTML.replace(/\{ks::index\s+([^}]+)}/i, function(tagHTML, pathString) {
            found = true;
            //KeySpaceDB.listURLIndex(pathString, function(urls) {
            //    var pathHTML = "<ul class='path-index'>";
            //    for(var i=0; i<urls.length; i++)
            //        pathHTML += "\t<li><a href='" + urls[i][0] + "'>" + urls[i][1] + "</a></li>";
            //    pathHTML += "</ul>";
            //    callback(pathHTML);
            //});
        });

        if(!found) {
            console.warn("Could not find content for tag: " + tagHTML);
            callback("<span class='tag-error'>Tag content not found</span>");
        }
    }


})();
/**
 * Created by ari on 10/6/2015.
 */

// Exports

if(!exports) var exports = {};

(function() {
    exports = parseTags;



    var tags = [
        [/^body\.minimal/i, parseBodyTag]
    ];



    function parseTags(tagHTML, callback) {
        var match = /{\$([a-z][^}]+)}/.exec(tagHTML);
        if(!match) {
            callback(tagHTML);
            return;
        }

        var tagString = match[0];
        var tagContent = match[1];

        for(var i=0; i<tags.length; i++) {
            if(tags[i][0].test(tagContent)) {
                tags[i][1](tagContent, function(tagContent) {
                    tagHTML = tagHTML
                        .replace(tagString, tagContent);
                    parseTags(tagHTML, callback);
                });
                return;
            }
        }

        throw new Error("Invalid Tag: " + tagString);
    }
})();


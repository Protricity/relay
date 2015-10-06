/**
 * Created by ari on 10/5/2015.
 */

(function() {

    // TODO send all requests to client-render or theme
    var tags = [
        [/^body(?:\.(\w+))?/i, parseBodyTag]
    ];

    function parseBodyTag(tagHTML, callback) {
        var match = /^body(?:\.(\w+))?/.exec(tagHTML);
        if (!match)
            throw new Error("Invalid Body Tag: " + tagHTML);

        var themeName = match[1];

        if(themeName) {
            var ClientThemes = (function(path) {
                if(typeof require === 'function')
                    return require('../' + path);
                self.exports = {};
                importScripts(path);
                return self.exports;
            })('client/themes/themes.js').ClientThemes;

            if(ClientThemes.parseThemeTags(themeName, tagHTML, callback))
                return true;
        }


    }


    // Exports

    if (!exports) var exports = {};
    exports.parseClientTags = parseClientTags;

    function parseClientTags(Client, tagHTML, callback) {
        var match = /{\$([a-z][^}]+)}/.exec(tagHTML);
        if (!match) {
            callback(tagHTML);
            return;
        }

        var tagString = match[0];
        var tagContent = match[1];

        for (var i = 0; i < tags.length; i++) {
            if (tags[i][0].test(tagContent)) {
                tags[i][1](tagContent, function (tagContent) {
                    tagHTML = tagHTML
                        .replace(tagString, tagContent);
                    parseClientTags(tagHTML, callback);
                });
                return;
            }
        }

        throw new Error("Invalid Tag: " + tagString);
    }

})();
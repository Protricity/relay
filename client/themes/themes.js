/**
 * Created by ari on 10/6/2015.
 */

function ClientThemes() {

}

if(!exports) var exports = {};
exports.ClientThemes = ClientThemes;

(function(){
    var themes = {};
    ClientThemes.add = function(themeName, themeCallback) {
        if(ClientThemes.has(themeName))
            throw new Error("Theme already added: " + themeName);

        themes[themeName.toLowerCase()] = themeCallback;
    };

    ClientThemes.has = function(themeName) {
        return typeof themes[themeName.toLowerCase()] !== 'undefined';
    };

    ClientThemes.parseThemeTags = function(themeName, tagHTML, callback) {
        if(!ClientThemes.has(themeName))
            throw new Error("Theme not found: " + themeName);

        var themeValue = themes[themeName.toLowerCase()];
        if(typeof themeValue === 'function') {
        } else if(typeof themeValue === 'string') {
            var exports = (function() {
                if(typeof require === 'function')
                    return require('../../' + themeValue);
                self.exports = {};
                importScripts(themeValue);
                return self.exports;
            })();
            if(typeof exports !== 'function')
                throw new Error("Invalid Export: " + themeValue);

            console.log("Loaded Theme: " + themeValue);
            themeValue = themes[themeName.toLowerCase()] = exports;

        } else {
            throw new Error("Invalid Theme");
        }
        return themeValue(tagHTML, callback);
    };
})();

// Proxies

ClientThemes.add('minimal', 'client/themes/minimal/minimal-tags.js');

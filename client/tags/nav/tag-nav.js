/**
 * Created by ari on 10/5/2015.
 */

// Worker Scripts
if(typeof module === 'object') (function() {
    module.exports.renderNavTag = function (tagHTML, callback) {
        var match = /^\{nav(?::([^} ]+))?}$/i.exec(tagHTML);
        if (!match)
            throw new Error("Invalid Nav Tag: " + tagHTML);

        var subTag = (match[1] || '').toLowerCase();
        var TEMPLATE_URL;
        switch(subTag) {
            case "":
            case "menu":
                return renderNavMenuTag(tagHTML, callback);
                break;

            default:
                throw new Error("Unknown subtag: " + tagHTML);
        }
    };

    var renderNavMenuTag =
    module.exports.renderNavMenuTag = function (tagHTML, callback) {
        var TEMPLATE_URL = 'client/tags/nav/tag-nav-menu.html';

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if (xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        callback(xhr.responseText);
        return true;
    };

})();
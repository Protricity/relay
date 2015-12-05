/**
 * Created by ari on 10/5/2015.
 */

// Worker Scripts
if(typeof module === 'object') (function() {
    module.exports.renderNavTag = function (tagHTML, callback) {
        var match = /^\{nav:([\w-]+)/i.exec(tagHTML);
        if (!match)
            throw new Error("Invalid Nav Tag: " + tagHTML);

        var subTag = match[1].toLowerCase();
        var TEMPLATE_URL;
        switch(subTag) {
            case "menu":
                return renderNavMenuTag(tagHTML, callback);
                break;

            case "header-buttons":
                return renderNavHeaderButtonsTag(tagHTML, callback);
                break;

            default:
                throw new Error("Unknown subtag: " + tagHTML);
        }
    };

    var renderNavMenuTag =
    module.exports.renderNavMenuTag = function (tagHTML, callback) {
        var TEMPLATE_URL = 'client/tags/nav/client-nav-menu-tag.html';

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if (xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        callback(xhr.responseText);
        return true;
    };

    var renderNavHeaderButtonsTag =
    module.exports.renderNavMenuTag = function (tagHTML, callback) {

        var match = /^\{nav:header-buttons\s+([^}]+)}$/i.exec(tagHTML);
        if (!match)
            throw new Error("Invalid Nav Header Buttons Tag Format: " + tagHTML);

        var className = match[1];
        var TEMPLATE_URL = 'client/tags/nav/client-nav-header-buttons-tag.html';

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if (xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        callback(xhr.responseText
            .replace(/{\$class}/gi, className)
        );
        return true;
    };
})();
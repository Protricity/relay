/**
 * Created by ari on 10/5/2015.
 */

// Worker Scripts
if(typeof module === 'object') (function() {
    module.exports.renderHeaderTag = function (tagHTML, callback) {
        var match = /^\{header:([^ ]+)/i.exec(tagHTML);
        if (!match)
            throw new Error("Invalid Nav Tag: " + tagHTML);

        var subTag = match[1].toLowerCase();
        switch(subTag) {
            case "buttons":
                return renderHeaderButtonsTag(tagHTML, callback);
                break;

            default:
                throw new Error("Unknown subtag: " + tagHTML);
        }
    };

    var renderHeaderButtonsTag =
    module.exports.renderHeaderButtonsTag = function (tagHTML, callback) {
        var match = /^\{header:buttons\s+([^}]+)}$/i.exec(tagHTML);
        if (!match)
            throw new Error("Invalid Nav Header Buttons Tag Format: " + tagHTML);

        var className = match[1];
        var TEMPLATE_URL = 'render/tags/header/tag-header-buttons.html';

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
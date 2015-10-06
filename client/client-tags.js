/**
 * Created by ari on 10/5/2015.
 */

var tags = [
    [/^body/i, parseBodyTag]
];

function parseBodyTag(tagHTML, callback) {
    var match = /^body(?:\.(\w+))?/.exec(tagHTML);
    if(!match)
        throw new Error("Invalid Body Tag: " + tagHTML);

    var theme = match[1];

    importScripts('client/theme/client-body-template.js');
    Templates.client.body(theme, callback);
}

// Exports

if(!exports) var exports = {};
exports.parseClientTags = parseClientTags;

function parseClientTags(tagHTML, callback) {
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
                parseClientTags(tagHTML, callback);
            });
            return;
        }
    }

    throw new Error("Invalid Tag: " + tagString);
}


/**
 * Created by ari on 10/5/2015.
 */

var tags = [
    /\$body
]


if(!exports) var exports = {};
exports.parseClientTags = parseClientTags;

function parseClientTags(tagHTML, callback) {
    console.log(tagHTML);
    console.log(match);
    // TODO pre load tag regex via client-tags.js

    var tagString = match[0];
    var tagContent = match[1];
    var tagNamespace = 'websocket';
    if(tagContent.indexOf('::') !== -1) {
        tagNamespace = tagContent.split('::', 2)[0].toLowerCase();
        if(!/^\w+$/.test(tagNamespace))
            throw new Error("Invalid Tag Namespace: " + tagString);
    }
    if(typeof tagCallbacks[tagNamespace] === 'undefined') {
        tagCallbacks[tagNamespace] = false;
        importScripts(tagNamespace + '/' + tagNamespace + '-tags.js');
    }
    var tagCall = tagCallbacks[tagNamespace];

    tagCall(tagString, function(tagContent) {
        parseClientTags(htmlContent
                .replace(tagString, tagContent),
            callback
        );
    });
}
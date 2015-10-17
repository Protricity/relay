/**
 * Created by ari on 10/5/2015.
 */

if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.tags = [
    [/^\{nav[^}]*}$/i, function(tagHTML, callback, Client) {
        self.exports = {};
        self.module = {exports: {}};
        importScripts('client/tags/client-nav-tag.js');
        self.module.exports.renderNavTag(tagHTML, callback, Client);
    }],

    [/^\{ks::[^}]*}$/i, function(tagHTML, callback, Client) {
        self.exports = {};
        self.module = {exports: {}};
        importScripts('ks/tags/ks-tags.js');
        self.module.exports.renderKeySpaceTag(tagHTML, callback, Client);
    }]
];
/**
 * Created by ari on 10/5/2015.
 */

if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.tags = [
    [/^\{nav[^}]*}$/i, function(tagHTML, callback, Client) {
        self.module = {exports: {}};
        importScripts('ui/tags/nav/tag-nav.js');
        self.module.exports.renderNavTag(tagHTML, callback, Client);
    }],

    [/^\{header[^}]*}$/i, function(tagHTML, callback, Client) {
        self.module = {exports: {}};
        importScripts('ui/tags/header/tag-header.js');
        self.module.exports.renderHeaderTag(tagHTML, callback, Client);
    }],

    [/^\{ks::[^}]*}$/i, function(tagHTML, callback, Client) {
        self.module = {exports: {}};
        importScripts('keyspace/tags/ks-tags.js');
        self.module.exports.renderKeySpaceTag(tagHTML, callback, Client);
    }]
];
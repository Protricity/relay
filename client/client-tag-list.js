/**
 * Created by ari on 10/5/2015.
 */

// TODO: theme
if (!exports) var exports = {};
exports.tags = [
    [/^{\$nav[^}]*}$/i, function(tagHTML, callback) {
        importScripts('client/tags/client-nav-tag.js');
        Tags.client.nav(tagHTML, callback);
        delete Tags.client.nav;
    }]
];
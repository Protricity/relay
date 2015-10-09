/**
 * Created by ari on 10/5/2015.
 */

// TODO: theme
if (!exports) var exports = {};
exports.tags = [
    [/^{\$nav[^}]*}$/i, function(tagHTML, callback, Client) {
        importScripts('client/tags/client-nav-tag.js');
        Tags.client.nav(tagHTML, callback, Client);
        delete Tags.client.nav;
    }]
];
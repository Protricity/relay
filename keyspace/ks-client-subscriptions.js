/**
 * Created by ari on 12/17/2015.
 */

"use strict";
if (!module) var module = {exports: {}};
if (typeof self === 'undefined')
    var self = this;
module.exports.KeySpaceClientSubscriptions =
    typeof self.KeySpaceClientSubscriptions !== 'undefined' ? self.KeySpaceClientSubscriptions :

(function() {

    function KeySpaceClientSubscriptions() {

    }

    var keyspaces = {};

    KeySpaceClientSubscriptions.add = function(pgp_id_public, mode, webSocket) {
        mode = mode.toLowerCase();
        if(typeof keyspaces[pgp_id_public.toLowerCase()] === 'undefined')
            keyspaces[pgp_id_public.toLowerCase()] = {modes:[]};
        var keyspaceSubscription = keyspaces[pgp_id_public.toLowerCase()];
        if(keyspaceSubscription.modes.indexOf(mode) === 0)
            return false;
        keyspaceSubscription.webSocket = webSocket;
        keyspaceSubscription.modes.push(mode);
        return true;
    };

    KeySpaceClientSubscriptions.replace = function(pgp_id_public, mode, webSocket) {
        mode = mode.toLowerCase();
        if(typeof keyspaces[pgp_id_public.toLowerCase()] === 'undefined')
            throw new Error("Failed to replace. No such keyspace: " + pgp_id_public);
        var keyspaceSubscription = keyspaces[pgp_id_public.toLowerCase()];
        if(keyspaceSubscription.modes.indexOf(mode) === -1)
            throw new Error("Failed to replace. Mode not found: " + mode);
        keyspaceSubscription.webSocket = webSocket;
        keyspaceSubscription.modes.push(mode);
        return true;
    };

    KeySpaceClientSubscriptions.remove = function(pgp_id_public, mode, webSocket) {
        mode = mode.toLowerCase();
        if(typeof keyspaces[pgp_id_public.toLowerCase()] === 'undefined')
            return false;
        var keyspaceSubscription = keyspaces[pgp_id_public.toLowerCase()];
        var pos = keyspaceSubscription.modes.indexOf(mode);
        if(pos === -1)
            return false;
        keyspaceSubscription.webSocket = webSocket;
        keyspaceSubscription.modes.splice(pos, 1);
        return true;
    };

    KeySpaceClientSubscriptions.getKeySpaceClientSubscriptions = function(callback) {
        // TODO: inefficient?
        var count = 0;
        for(var pgp_id_public in keyspaces) {
            if(keyspaces.hasOwnProperty(pgp_id_public)) {
                var keyspaceSubscription = keyspaces[pgp_id_public];
                var webSocket = keyspaceSubscription.webSocket;
                for(var i=0; i<keyspaceSubscription.modes.length; i++) {
                    var keyspaceMode = keyspaceSubscription.modes[i];
                    callback(pgp_id_public, keyspaceMode, webSocket);
                }
            }
        }
        return count;
    };

    return KeySpaceClientSubscriptions;
})();
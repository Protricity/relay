/**
 * Created by ari on 12/17/2015.
 */

"use strict";
if (!module) var module = {exports: {}};
if (typeof self === 'undefined')
    var self = this;
module.exports.ServerSubscriptions =
    typeof self.ServerSubscriptions !== 'undefined' ? self.ServerSubscriptions :

(function() {

    function ServerSubscriptions() {

    }

    var DEFAULT_MODE = 'event';

    var keyspaceSubscriptions = {};
    var channelSubscriptions = {};

    // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
    // KEYSPACE.SUBSCRIBE.GET ABCD1234 ABCD1234 <-- host keyspace content
    // KEYSPACE.SUBSCRIBE.PUT ABCD1234 ABCD1234 <-- host keyspace service
    ServerSubscriptions.handleSubscription = function(subscriptionString, client) {
        var match = /^(\w+)\.(|un|re)subscribe(?:\.(\w+))?\s+((\S+)[\s\S]*)$/im.exec(subscriptionString);
        if (!match)
            throw new Error("Invalid Subscription: " + subscriptionString);

        var type = match[1].toLowerCase();
        var prefix = match[2].toLowerCase();
        var mode = (match[3] || DEFAULT_MODE).toLowerCase();
        var argString = match[5];

        var modeList;
        var list;
        switch(type) {
            case 'keyspace':
                var pgp_id_public = match[4].toUpperCase();
                if(!/[a-f0-9]{8,}/.exec(pgp_id_public))
                    throw new Error("Invalid PGP Public ID Key: " + pgp_id_public);
                if(typeof keyspaceSubscriptions[pgp_id_public] === 'undefined')
                    keyspaceSubscriptions[pgp_id_public] = {};
                modeList = keyspaceSubscriptions[pgp_id_public];

                switch (mode) {
                    case 'get':
                    case 'post':
                    case 'put':
                    case 'status':
                        if(typeof modeList[mode] === 'undefined')
                            modeList[mode] = [];
                        list = modeList[mode];
                        break;
                    default:
                        throw new Error("Invalid KeySpace Mode: " + subscriptionString);
                }
                break;

            case 'channel':
                var channel = match[4].toLowerCase();
                if(typeof channelSubscriptions[channel] === 'undefined')
                    channelSubscriptions[channel] = {};
                modeList = channelSubscriptions[channel];
                switch (mode) {
                    case 'event':
                    case 'chat':
                    case 'audio':
                    case 'video':
                        if(typeof modeList[mode] === 'undefined')
                            modeList[mode] = [];
                        list = modeList[mode];
                        break;
                    default:
                        throw new Error("Invalid Channel Mode: " + subscriptionString);
                }
                break;

            default:
                throw new Error("Invalid Subscription Type: " + subscriptionString);
        }

        // TODO: fix old prefix for RE-. this logic isn't right. Is it fixed already?
        var oldPos = -1;
        var oldSubscriptionString = null;
        for(var i=0; i<list.length; i++) {
            if(list[i][1] === client){
                oldPos = i;
                oldSubscriptionString = list[i][0];
                break;
            }
        }

        if(prefix === 'un') {
            if(oldPos === -1)
                throw new Error("Old Subscription not found: " + subscriptionString);
            list[oldPos] = [client, argString];
            console.log(type + " subscription removed: ", subscriptionString);

        } else if(prefix === 're') {
            if(oldPos === -1) {
                list.push([client, argString]);
                console.warn("Old Subscription not found: ", subscriptionString);

            } else {
                list[oldPos] = [client, argString];
                console.log(type + " subscription replaced: ", subscriptionString);
            }

        } else {
            if(oldPos === -1) {
                list.push([client, argString]);
                console.log(type + " subscription: ", subscriptionString);

            } else {
                list[oldPos] = [client, argString];
                console.warn(type + " subscription replaced: ", subscriptionString);
            }
        }
        return oldSubscriptionString;
    };

    ServerSubscriptions.getKeySpaceSubscriptions = function(pgp_id_public, mode) {
        if(mode)          mode = mode.toLowerCase();
        if(pgp_id_public) pgp_id_public = pgp_id_public.toUpperCase();
        if(typeof keyspaceSubscriptions[pgp_id_public] === 'undefined')
            return [];
        var modeList = keyspaceSubscriptions[pgp_id_public];
        if(typeof modeList[mode] === 'undefined')
            return [];
        return modeList[mode];
    };

    ServerSubscriptions.searchKeySpaceSubscriptions = function(searchClient, searchMode, searchPublicKeyID, callback) {
        if(searchMode)          searchMode = searchMode.toLowerCase();
        if(searchPublicKeyID) searchPublicKeyID = searchPublicKeyID.toUpperCase();
        var count = 0;
        for(var pgp_id_public in keyspaceSubscriptions) {
            if(keyspaceSubscriptions.hasOwnProperty(pgp_id_public)) {
                if(searchPublicKeyID && pgp_id_public === searchPublicKeyID)
                    return;
                var modeList = keyspaceSubscriptions[pgp_id_public];
                for(var mode in modeList) {
                    if(modeList.hasOwnProperty(mode)) {
                        if(searchMode && searchMode !== mode)
                            continue;
                        var clientList = modeList[mode];
                        for(var i=0; i<clientList; i++) {
                            var ret = callback(clientList[i][0], mode, pgp_id_public, clientList[i][1]);
                            count++;
                            if(ret === true)
                                return count;
                        }
                    }
                }
            }
        }

        return count;
    };


    ServerSubscriptions.getClientChannelArgString = function(client, channel, mode) {
        var clientList = ServerSubscriptions.getChannelSubscriptions(channel, mode);
        for(var i=0; i<clientList.length; i++) {
            if(clientList[i][0] === client) {
                return clientList[i][1];
            }
        }
    };

    ServerSubscriptions.getChannelSubscriptions = function(channel, mode) {
        if(mode)          mode = mode.toLowerCase();
        if(channel) channel = channel.toLowerCase();
        if(typeof channelSubscriptions[channel] === 'undefined')
            return [];
        var modeList = channelSubscriptions[channel];
        if(typeof modeList[mode] === 'undefined')
            return [];
        return modeList[mode];
    };

    ServerSubscriptions.searchChannelSubscriptions = function(searchClient, searchChannelPrefix, searchMode, callback) {
        if(searchMode)          searchMode = searchMode.toLowerCase();
        if(searchChannelPrefix) searchChannelPrefix = searchChannelPrefix.toLowerCase();
        var count = 0;
        for(var channel in channelSubscriptions) {
            if(channelSubscriptions.hasOwnProperty(channel)) {
                if(searchChannelPrefix && channel.indexOf(searchChannelPrefix) !== 0)
                    return;
                var modeList = channelSubscriptions[channel];
                for(var mode in modeList) {
                    if(modeList.hasOwnProperty(mode)) {
                        if(searchMode && searchMode !== mode)
                            continue;
                        var clientList = modeList[mode];
                        for(var i=0; i<clientList; i++) {
                            var ret = callback(clientList[i][0], channel, mode, clientList[i][1]);
                            count++;
                            if(ret === true)
                                return count;
                        }
                    }
                }
            }
        }

        return count;
    };


    return ServerSubscriptions;
})();
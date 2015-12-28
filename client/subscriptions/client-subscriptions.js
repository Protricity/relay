/**
 * Created by ari on 12/17/2015.
 */

"use strict";
if (!module) var module = {exports: {}};
if (typeof self === 'undefined')
    var self = this;
module.exports.ClientSubscriptions =
    typeof self.ClientSubscriptions !== 'undefined' ? self.ClientSubscriptions :

(function() {

    function ClientSubscriptions() {

    }

    var DEFAULT_MODE = 'EVENT';

    var keyspaceSubscriptions = {};
    var channelSubscriptions = {};
    var channelUserLists = {};



    // USERLIST Response
    ClientSubscriptions.handleChannelUserList = function(responseString) {
        var match = /^(?:channel\.)?userlist\.(\w+)\s(\S+)\n([\s\S]+)$/im.exec(responseString);
        if (!match)
            throw new Error("Invalid UserList: " + responseString);

        var mode = match[1];
        var channel = match[2].toLowerCase();
        var subscriptionList = match[3].split(/\n+/img);

        if(typeof channelUserLists[mode] === 'undefined')
            channelUserLists[mode] = {};

        var modeChannels = channelUserLists[mode];

        var oldUserList = modeChannels[channel] || null;
        modeChannels[channel] = subscriptionList;
        return oldUserList;
    };

    ClientSubscriptions.getChannelUserList = function(mode, channel) {
        mode = mode.toLowerCase();
        channel = channel.toLowerCase();
        if(typeof channelUserLists[mode] === 'undefined')
            return [];
        var channelModes = channelUserLists[mode];
        if(typeof channelModes[channel] === 'undefined')
            return [];
        return channelModes[channel];
    };

    // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
    // KEYSPACE.SUBSCRIBE.GET ABCD1234 <-- host keyspace content
    // KEYSPACE.SUBSCRIBE.PUT ABCD1234 <-- host keyspace service
    ClientSubscriptions.handleSubscription = function(subscriptionString) {
        var match = /^(\w+)\.(|un|re)subscribe\.(\w+)\s+(\S+)/im.exec(subscriptionString);
        if (!match)
            throw new Error("Invalid Subscription: " + subscriptionString);

        var type = match[1].toLowerCase();
        var prefix = match[2].toLowerCase();
        var mode = (match[3] || DEFAULT_MODE).toLowerCase();
        var argString = match[5];

        var modeList;
        var oldSubscriptionString = null;
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
                        break;
                    default:
                        throw new Error("Invalid Channel Mode: " + subscriptionString);
                }
                break;

            default:
                throw new Error("Invalid Subscription Type: " + subscriptionString);
        }

        if(typeof modeList[mode] !== 'undefined')
            oldSubscriptionString = modeList[mode];

        if(prefix === 'un') {
            if(!oldSubscriptionString)
                throw new Error("Old Subscription not found: " + subscriptionString);
            delete modeList[mode];
            console.log(type + " subscription removed: ", subscriptionString);

        } else if(prefix === 're') {
            modeList[mode] = argString;
            if(!oldSubscriptionString) {
                console.warn("Old Subscription not found: " + subscriptionString);

            } else {
                console.log(type + " subscription replaced: ", subscriptionString);
            }

        } else {
            modeList[mode] = argString;
            if(!oldSubscriptionString) {
                console.log(type + " subscription: ", subscriptionString);
            } else {
                console.warn(type + " subscription replaced: ", subscriptionString);
            }
        }

        return oldSubscriptionString;
    };


    ClientSubscriptions.getKeySpaceSubscription = function(pgp_id_public, mode) {
        if(mode)          mode = mode.toLowerCase();
        if(pgp_id_public) pgp_id_public = pgp_id_public.toUpperCase();
        if(typeof keyspaceSubscriptions[pgp_id_public] === 'undefined')
            return [];
        var modeList = keyspaceSubscriptions[pgp_id_public];
        if(typeof modeList[mode] === 'undefined')
            return null;
        return modeList[mode];
    };

    ClientSubscriptions.searchKeySpaceSubscriptions = function(searchMode, searchPublicKeyID, callback) {
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
                        var argString = modeList[mode];
                        var ret = callback(mode, pgp_id_public, argString);
                        count++;
                        if(ret === true)
                            return count;
                    }
                }
            }
        }

        return count;
    };


    ClientSubscriptions.getChannelSubscription = function(channel, mode) {
        if(mode)          mode = mode.toLowerCase();
        if(channel) channel = channel.toLowerCase();
        if(typeof channelSubscriptions[channel] === 'undefined')
            return [];
        var modeList = channelSubscriptions[channel];
        if(typeof modeList[mode] === 'undefined')
            return null;
        return modeList[mode];
    };

    ClientSubscriptions.searchChannelSubscriptions = function(searchChannelPrefix, searchMode, callback) {
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
                        var argString = modeList[mode];
                        var ret = callback(mode, channel, argString);
                        count++;
                        if(ret === true)
                            return count;
                    }
                }
            }
        }

        return count;
    };

    return ClientSubscriptions;
})();
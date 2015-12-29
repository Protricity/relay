/**
 * Created by ari on 12/17/2015.
 */

// Enable Strict mode
"use strict";

// Declare export module, if not found
if (!module) var module = {exports: {}};

// Declare self as a variable if it doesn't already exist
if (typeof self === 'undefined')
    var self = this;

// Export ClientSubscriptions Class. Define it if it hasn't
module.exports.ClientSubscriptions =
    typeof self.ClientSubscriptions !== 'undefined' ? self.ClientSubscriptions :

(function() {

    function ClientSubscriptions() {

    }

    // Default Subscription Mode
    var DEFAULT_MODE = 'event';

    // KeySpace Subscription Object
    var keyspaceSubscriptions = {};

    // Channel Subscription Object
    var channelSubscriptions = {};

    // Channel User List Object
    var channelUserLists = {};



    // TODO: needs comments
    ClientSubscriptions.handleClientUserList = function(responseString) {
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

    // TODO: needs comments
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

    // TODO: needs comments. These are examples for usage:
    // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
    // KEYSPACE.SUBSCRIBE.GET ABCD1234 <-- host keyspace content
    // KEYSPACE.SUBSCRIBE.PUT ABCD1234 <-- host keyspace service
    ClientSubscriptions.handleServerSubscription = function(subscriptionString, e) {
        var match = /^(\w+)\.(|un|re)subscribe(?:\.(\w+))?\s+(\S+)\s*([\s\S]*)$/im.exec(subscriptionString);
        if (!match)
            throw new Error("Invalid Subscription: " + subscriptionString);

        var webSocket = e.target || null;

        var type = match[1].toLowerCase();
        var prefix = match[2].toLowerCase();
        var mode = (match[3] || DEFAULT_MODE).toLowerCase();
        var argString = match[5];

        var modeList;
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
                var channelOriginalCase = match[4];
                var channel = channelOriginalCase.toLowerCase();
                if(typeof channelSubscriptions[channel] === 'undefined')
                    channelSubscriptions[channel] = {};
                modeList = channelSubscriptions[channel];
                if(typeof modeList._channel_original_case === 'undefined')
                    modeList._channel_original_case = channelOriginalCase;
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


        var existingSubscriptionString = null;
        // Look for existing subscription for this mode
        if(typeof modeList[mode] !== 'undefined') {
            // Existing Subscription found
            existingSubscriptionString = modeList[mode][0];
            //console.log("Existing Subscription Found: " + oldSubscriptionString);
        }

        if(prefix === 'un') {
            if(!existingSubscriptionString)
                throw new Error("Old Subscription not found: " + subscriptionString);
            delete modeList[mode];
            console.log(type + " subscription removed: ", subscriptionString);

        } else if(prefix === 're') {
            modeList[mode] = [argString, webSocket];
            if(!existingSubscriptionString) {
                console.warn("Old Subscription not found: " + subscriptionString);

            } else {
                console.log(type + " subscription replaced: ", subscriptionString);
            }

        } else {
            modeList[mode] = [argString, webSocket];
            if(!existingSubscriptionString) {
                console.log(type + " subscription: ", subscriptionString);
            } else {
                console.warn(type + " subscription replaced: ", subscriptionString);
            }
        }

        return existingSubscriptionString;
    };

    ClientSubscriptions.searchKeySpaceSubscriptions = function(searchMode, searchPublicKeyID, callback) {
        if(searchMode)          searchMode = searchMode.toLowerCase();
        if(searchPublicKeyID) searchPublicKeyID = searchPublicKeyID.toUpperCase();
        var count = 0;
        for(var pgp_id_public in keyspaceSubscriptions) {
            if(pgp_id_public[0] !== '_' && keyspaceSubscriptions.hasOwnProperty(pgp_id_public)) {
                if(searchPublicKeyID && pgp_id_public === searchPublicKeyID)
                    return;
                var modeList = keyspaceSubscriptions[pgp_id_public];
                for(var mode in modeList) {
                    if(mode[0] !== '_' && modeList.hasOwnProperty(mode)) {
                        if(searchMode && searchMode !== mode)
                            continue;
                        var argString = modeList[mode][0];
                        var webSocket = modeList[mode][1];
                        var ret = callback(mode, pgp_id_public, argString, webSocket);
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
            if(channel[0] !== '_' && channelSubscriptions.hasOwnProperty(channel)) {
                if(searchChannelPrefix && channel.indexOf(searchChannelPrefix) !== 0)
                    return;
                var modeList = channelSubscriptions[channel];
                var channelOriginalCase = modeList._channel_original_case || channel;
                for(var mode in modeList) {
                    if(mode[0] !== '_' && modeList.hasOwnProperty(mode)) {
                        if(searchMode && searchMode !== mode)
                            continue;
                        var argString = modeList[mode];
                        var ret = callback(channelOriginalCase, mode, argString);
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
/**
 * Created by ari on 12/17/2015.
 *
 * Provides a memory-based subscription database for active user subscriptions.
 * Other modules use this class to query and keep track of subscriptions in real-time
 */

// Enable Strict mode
"use strict";

// Declare export module, if not found
if (!module) var module = {exports: {}};

// Declare self as a variable if it doesn't already exist
if (typeof self === 'undefined')
    var self = this;

// Export ServerSubscriptions Class. Define it if it hasn't
module.exports.ServerSubscriptions =
    typeof self.ServerSubscriptions !== 'undefined' ? self.ServerSubscriptions : self.ServerSubscriptions =
(function() {
    // ServerSubscriptions has not been defined yet, so let's define it
    function ServerSubscriptions() {

    }

    // Default Subscription Mode
    var DEFAULT_MODE = 'event';

    // KeySpace Subscription Object
    var keyspaceSubscriptions = {};

    // Channel Subscription Object
    var channelSubscriptions = {};

    /**
     * @param subscriptionString
     * @param client
     * @returns string if an old subscription exists for this client
     * @example CHANNEL.SUBSCRIBE.CHAT /state/az guest123
     * @example KEYSPACE.SUBSCRIBE.GET ABCD1234 ABCD1234 <-- host keyspace content
     * @example KEYSPACE.SUBSCRIBE.PUT ABCD1234 ABCD1234 <-- host keyspace service
     */
    ServerSubscriptions.handleSubscription = function(subscriptionString, client) {
        var match = /^(\w+)\.(|un|re)subscribe(?:\.(\w+))?\s+((\S+)[\s\S]*)$/im.exec(subscriptionString);
        if (!match)
            throw new Error("Invalid Subscription: " + subscriptionString);

        // New Subscription was matched correctly, so let's handle it
        var type = match[1].toLowerCase();
        var prefix = match[2].toLowerCase();
        var mode = (match[3] || DEFAULT_MODE).toLowerCase();
        var argString = match[5];

        var modeList;
        var clientList;
        switch(type) {
            case 'keyspace':
                // This is a keyspace subscription, so the first arg is the PGP Public Key ID
                var pgp_id_public = match[4].toUpperCase();
                if(!/[a-f0-9]{8,}/.exec(pgp_id_public))
                    throw new Error("Invalid PGP Public ID Key: " + pgp_id_public);
                if(typeof keyspaceSubscriptions[pgp_id_public] === 'undefined')
                    keyspaceSubscriptions[pgp_id_public] = {};
                modeList = keyspaceSubscriptions[pgp_id_public];

                switch (mode) {
                    case 'event':
                    case 'get':
                    case 'post':
                    case 'put':
                        // If this mode hasn't been defined yet, lets create the array
                        if(typeof modeList[mode] === 'undefined')
                            modeList[mode] = [];

                        // Set this mode list as the list to be modified
                        clientList = modeList[mode];
                        break;
                    default:
                        throw new Error("Invalid KeySpace Mode: " + subscriptionString);
                }
                break;

            case 'channel':
                // This is a channel subscription, so the first arg is the Channel Name
                var channel = match[4].toLowerCase();
                if(typeof channelSubscriptions[channel] === 'undefined')
                    channelSubscriptions[channel] = {};
                modeList = channelSubscriptions[channel];
                switch (mode) {
                    case 'event':
                    case 'chat':
                    case 'audio':
                    case 'video':
                        // If this mode hasn't been defined yet, lets create the array
                        if(typeof modeList[mode] === 'undefined')
                            modeList[mode] = [];

                        // Set this mode list as the list to be modified
                        clientList = modeList[mode];
                        break;
                    default:
                        throw new Error("Invalid Channel Mode: " + subscriptionString);
                }
                break;

            default:
                throw new Error("Invalid Subscription Type: " + subscriptionString);
        }

        var oldPos = -1;
        var oldSubscriptionString = null;
        // Find the old subscription matching this client for the specified list
        for(var i=0; i<clientList.length; i++) {
            // If the client matches, grab the old subscription string
            if(clientList[i][0] === client){
                oldPos = i;
                oldSubscriptionString = clientList[i][1];
                break;
            }
        }


        if(prefix === 'un') {       // If Unsubscribe,
            if(oldPos === -1)
                throw new Error("Old Subscription not found: " + subscriptionString);
            // Delete the subscription
            delete clientList[oldPos];
            console.log(type + " subscription removed: ", subscriptionString);


        } else if(prefix === 're') { // If ReSubscribe,
            if(oldPos === -1)
                throw new Error("Old Subscription not found: " + subscriptionString);
            // Replace the old subscription
            clientList[oldPos] = [client, argString];
            console.log(type + " subscription replaced: ", subscriptionString);

        } else {
            if(oldPos === -1) {
                // Add the subscription
                clientList.push([client, argString]);
                console.log(type + " subscription: ", subscriptionString);

            } else {
                // Replace the subscription
                clientList[oldPos] = [client, argString];
                console.warn(type + " subscription replaced: ", subscriptionString);
            }
        }

        // Return the old subscription, if found
        return oldSubscriptionString;
    };

    /**
     * Get KeySpace Subscriptions in a specific channel/mode
     * @param pgp_id_public
     * @param mode
     * @returns {*}
     */
    ServerSubscriptions.getKeySpaceSubscriptions = function(pgp_id_public, mode) {
        if(mode)          mode = mode.toLowerCase();
        if(pgp_id_public) pgp_id_public = pgp_id_public.toUpperCase();

        // If the ID wasn't found, return an empty array
        if(typeof keyspaceSubscriptions[pgp_id_public] === 'undefined')
            return [];
        var modeList = keyspaceSubscriptions[pgp_id_public];

        // If the KeySpace mode was not found, return an empty array.
        if(typeof modeList[mode] === 'undefined')
            return [];

        // Return the KeySpace Subscriptions Array
        return modeList[mode];
    };

    /**
     * Search through all KeySpace subscriptions
     * @param searchClient optionally match subscriptions by client
     * @param searchMode optionally match subscriptions by mode
     * @param searchPublicKeyID optionally match subscriptions by Public Key ID
     * @param callback matched entries are returned through this callback
     * @returns {number} number of matched KeySpace entries
     */
    ServerSubscriptions.searchKeySpaceSubscriptions = function(searchClient, searchMode, searchPublicKeyID, callback) {
        if(searchMode)          searchMode = searchMode.toLowerCase();
        if(searchPublicKeyID) searchPublicKeyID = searchPublicKeyID.toUpperCase();

        // Matched subscription counter
        var count = 0;

        // Loop through all channels
        for(var pgp_id_public in keyspaceSubscriptions) {
            if(keyspaceSubscriptions.hasOwnProperty(pgp_id_public)) {
                // Optionally match the pgp id
                if(searchPublicKeyID && pgp_id_public === searchPublicKeyID)
                    continue;

                // Grab the keyspace mode list
                var modeList = keyspaceSubscriptions[pgp_id_public];

                // Loop through all modes in each keyspace
                for(var mode in modeList) {
                    if(modeList.hasOwnProperty(mode)) {
                        // Optionally match the channel subscription mode
                        if(searchMode && searchMode !== mode)
                            continue;

                        // Grab the channel/mode client list
                        var clientList = modeList[mode];

                        // Loop through all clients in the channel/mode
                        for(var i=0; i<clientList; i++) {
                            var ret = callback(clientList[i][0], mode, pgp_id_public, clientList[i][1]);
                            // Count the matched subscription
                            count++;

                            // If true was returned by the callback, end the search here
                            if(ret === true)
                                return count;
                        }
                    }
                }
            }
        }

        // Return the matched subscriptions
        return count;
    };

    /**
     * Returns the Subscription ArgString for a client, if found
     * @param client subscriber client
     * @param channel subscribed channel
     * @param mode subscription mode
     */
    ServerSubscriptions.getClientChannelArgString = function(client, channel, mode) {
        var clientList = ServerSubscriptions.getChannelSubscriptions(channel, mode);
        for(var i=0; i<clientList.length; i++) {
            if(clientList[i][0] === client) {   // If client matches
                return clientList[i][1];        // Return the Subscription ArgString
            }
        }
    };

    /**
     * Returns a list of subscriptions for a specific channel/mode
     * @param channel
     * @param mode
     * @returns {*}
     */
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

    /**
     * Search through all Channel subscriptions
     * @param searchClient optionally match subscriptions by client
     * @param searchMode optionally match subscriptions by mode
     * @param searchChannelPrefix optionally match subscriptions by channel prefix
     * @param callback matched entries are returned through this callback
     * @returns {number} number of matched Channel entries
     */
    ServerSubscriptions.searchChannelSubscriptions = function(searchClient, searchChannelPrefix, searchMode, callback) {
        if(searchMode)          searchMode = searchMode.toLowerCase();                      // Modes are lowercase
        if(searchChannelPrefix) searchChannelPrefix = searchChannelPrefix.toLowerCase();    // Channels are lowercase

        // Matched subscription counter
        var count = 0;

        // Loop through all channels
        for(var channel in channelSubscriptions) {
            if(channelSubscriptions.hasOwnProperty(channel)) {
                // Optionally match the channel prefix
                if(searchChannelPrefix && channel.indexOf(searchChannelPrefix) !== 0)
                    continue;

                // Grab the channel mode list
                var modeList = channelSubscriptions[channel];

                // Loop through all modes in each channel
                for(var mode in modeList) {
                    if(modeList.hasOwnProperty(mode)) {
                        // Optionally match the channel subscription mode
                        if(searchMode && searchMode !== mode)
                            continue;

                        // Grab the channel/mode client list
                        var clientList = modeList[mode];

                        // Loop through all clients in the channel/mode
                        for(var i=0; i<clientList; i++) {
                            var ret = callback(clientList[i][0], channel, mode, clientList[i][1]);

                            // Count the matched subscription
                            count++;

                            // If true was returned by the callback, end the search here
                            if(ret === true)
                                return count;
                        }
                    }
                }
            }
        }

        // Return the matched subscriptions
        return count;
    };

    // Return newly defined class
    return ServerSubscriptions;
})();
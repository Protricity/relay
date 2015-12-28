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

        var matchString = match[0];
        var type = match[1].toLowerCase();
        var prefix = match[2].toLowerCase();
        var mode = (match[3] || DEFAULT_MODE).toLowerCase();
        var argString = match[5];

        var formattedSubscription = argString;
        var list;
        switch(type) {
            case 'keyspace':
                switch (mode) {
                    case 'get':
                    case 'post':
                    case 'put':
                    case 'status':
                        if(typeof keyspaceSubscriptions[mode] === 'undefined')
                            keyspaceSubscriptions[mode] = [];
                        list = keyspaceSubscriptions[mode];
                        break;
                    default:
                        throw new Error("Invalid KeySpace Mode: " + subscriptionString);
                }
                break;

            case 'channel':
                switch (mode) {
                    case 'event':
                    case 'chat':
                    case 'audio':
                    case 'video':
                        if(typeof channelSubscriptions[mode] === 'undefined')
                            channelSubscriptions[mode] = [];
                        list = channelSubscriptions[mode];
                        break;
                    default:
                        throw new Error("Invalid Channel Mode: " + subscriptionString);
                }
                break;

            default:
                throw new Error("Invalid Subscription Type: " + subscriptionString);
        }
        // TODO: fix old prefix for RE-. this logic isn't right
        var oldPos = -1;
        var oldSubscriptionString = null;
        for(var i=0; i<list.length; i++) {
            if(list[i][0].toLowerCase().indexOf(matchString) === 0){
                oldPos = i;
                oldSubscriptionString = list[i][0];
                break;
            }
        }

        if(prefix === 'un') {
            if(oldPos === -1)
                throw new Error("Old Subscription not found: " + formattedSubscription);
            list[oldPos] = [formattedSubscription, client];
            console.log(type + " subscription removed: ", formattedSubscription);

        } else if(prefix === 're') {
            if(oldPos === -1) {
                list.push([formattedSubscription, client]);
                console.warn("Old Subscription not found: " + formattedSubscription);

            } else {
                list[oldPos] = [formattedSubscription, client];
                console.log(type + " subscription replaced: ", formattedSubscription);
            }

        } else {
            if(oldPos === -1) {
                list.push([formattedSubscription, client]);
                console.log(type + " subscription: ", formattedSubscription);

            } else {
                list[oldPos] = [formattedSubscription, client];
                console.warn(type + " subscription replaced: ", formattedSubscription);
            }
        }
        return oldSubscriptionString;
    };

    ServerSubscriptions.getKeySpaceSubscriptions = function(searchMode, callback) {
        searchMode = searchMode.toLowerCase();
        if(typeof keyspaceSubscriptions[searchMode] === 'undefined')
            return;
        iterateList(keyspaceSubscriptions[searchMode],
            function(client, subscriptionString, type, mode, argString) {
                var pgp_id_public = argString.split(' ', 2)[0];
                return callback(client, pgp_id_public, mode, subscriptionString);
            }
        );
    };

    ServerSubscriptions.getChannelSubscriptions = function(searchMode, callback) {
        searchMode = searchMode.toLowerCase();
        if(typeof channelSubscriptions[searchMode] === 'undefined')
            return;
        iterateList(channelSubscriptions[searchMode],
            function(client, subscriptionString, type, mode, argString) {
                argString = argString.split(' ', 2);
                var channel = argString[0];
                argString = argString[1];
                return callback(client, channel, mode, argString, subscriptionString);
            }
        );
    };

    ServerSubscriptions.getChannelClients = function(searchMode, searchChannel) {
        searchChannel = searchChannel.toLowerCase();
        var clients = [];
        ServerSubscriptions.getChannelSubscriptions(searchMode,
            function(client, channel, mode, argString, subscriptionString) {
                if(searchChannel === channel.toLowerCase())
                    clients.push([client, argString]);
            }
        );
        return clients;
    };

    ServerSubscriptions.getClientChannelSubscriptions = function(searchClient, searchMode, searchChannelPrefix, callback) {
        searchMode = searchMode.toLowerCase();
        searchChannelPrefix = searchChannelPrefix.toLowerCase();
        if(typeof channelSubscriptions[searchChannelPrefix] === 'undefined')
            return [];
        var foundSubscriptions = [];
        iterateList(channelSubscriptions[searchMode],
            function(client, subscriptionString, type, mode, argString) {
                if(client !== searchClient)
                    return;
                if(searchMode && mode.toLowerCase() !== searchMode)
                    return;
                var channel = argString.split(' ', 2)[0];
                if(channel.toLowerCase().indexOf(searchChannelPrefix) !== 0)
                    return;

                foundSubscriptions.push(subscriptionString);
                return callback(subscriptionString);
            }
        );

        return foundSubscriptions;
    };


    function iterateList(list, callback) {
        for(var i=0; i<list.length; i++)  {
            var subscriptionString = list[i][0];
            var client = list[i][1];
            var match = /^(\w+)\.subscribe\.(\w+)\s+([\s\S]+)$/im.exec(subscriptionString);
            if (!match) {
                console.warn("iterateList: Invalid Subscription: " + subscriptionString);
                continue;
            }

            var type = match[1];
            var mode = match[2];
            var argString = match[3];

            if(callback(client, subscriptionString, type, mode, argString) === true)
                return;
        }
    }

    return ServerSubscriptions;
})();
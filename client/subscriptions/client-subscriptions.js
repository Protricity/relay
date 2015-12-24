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

    var keyspaceSubscriptions = [];
    var channelSubscriptions = [];

    // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
    // KEYSPACE.SUBSCRIBE.GET ABCD1234 <-- host keyspace content
    // KEYSPACE.SUBSCRIBE.PUT ABCD1234 <-- host keyspace service
    ClientSubscriptions.add = function(subscriptionString) {
        var match = /^(\w+)\.(|un|re)subscribe\.(\w+)\s+(\S+)/im.exec(subscriptionString);
        if (!match)
            throw new Error("Invalid Subscription: " + subscriptionString);

        var matchString = match[0];
        var type = match[1].toLowerCase();
        var prefix = match[2].toLowerCase();
        var mode = match[3].toLowerCase();
        //var argString = match[5];

        var formattedSubscription = subscriptionString;
        var list;
        switch(type) {
            case 'keyspace':
                switch (mode) {
                    case 'get':
                    case 'post':
                    case 'put':
                    case 'status':
                        list = keyspaceSubscriptions;
                        break;
                    default:
                        throw new Error("Invalid KeySpace Mode: " + subscriptionString);
                }
                break;

            case 'channel':
                switch (mode) {
                    case 'default':
                    case 'chat':
                    case 'audio':
                    case 'video':
                        list = channelSubscriptions;
                        break;
                    default:
                        throw new Error("Invalid Channel Mode: " + subscriptionString);
                }
                break;
            default:
                throw new Error("Invalid Subscription Type: " + subscriptionString);
        }

        var oldPos = -1;
        for(var i=0; i<list.length; i++) {
            if(list[i].toLowerCase().indexOf(matchString) === 0)
                oldPos = i;
            else continue;
            break;
        }

        if(prefix === 'un') {
            if(oldPos === -1)
                throw new Error("Old Subscription not found: " + formattedSubscription);
            list[oldPos] = formattedSubscription;
            console.log(type + " subscription removed: ", formattedSubscription);

        } else if(prefix === 're') {
            if(oldPos === -1) {
                list.push(formattedSubscription);
                console.warn("Old Subscription not found: " + formattedSubscription);

            } else {
                list[oldPos] = formattedSubscription;
                console.log(type + " subscription replaced: ", formattedSubscription);
            }

        } else {
            if(oldPos === -1) {
                list.push(formattedSubscription);
                console.log(type + " subscription: ", formattedSubscription);

            } else {
                list[oldPos] = formattedSubscription;
                console.warn(type + " subscription replaced: ", formattedSubscription);
            }
        }
    };

    ClientSubscriptions.getKeySpaceSubscriptions = function(callback) {
        iterateList(keyspaceSubscriptions, function(subscriptionString, type, mode, argString) {
            var pgp_id_public = argString.split(' ', 2)[0];
            return callback(pgp_id_public, mode, subscriptionString);
        });
    };

    ClientSubscriptions.getChannelSubscriptions = function(callback) {
        iterateList(channelSubscriptions, function(subscriptionString, type, mode, argString) {
            argString = argString.split(' ', 2);
            var channel = argString[0];
            argString = argString[1];
            return callback(channel, mode, argString, subscriptionString);
        });
    };

    function iterateList(list, callback) {
        for(var i=0; i<list.length; i++)  {

            var match = /^(\w+)\.subscribe\.(\w+)\s+([\s\S]+)$/im.exec(list[i]);
            if (!match) {
                console.warn("Invalid Subscription: " + list[i]);
                continue;
            }

            var type = match[1];
            var mode = match[2];
            var argString = match[3];

            if(callback(list[i], type, mode, argString) === true)
                return;
        }
    }

    return ClientSubscriptions;
})();
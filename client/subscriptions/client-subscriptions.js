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
    typeof self.ClientSubscriptions !== 'undefined' ? self.ClientSubscriptions : self.ClientSubscriptions = 

(function() {

    function ClientSubscriptions() {

    }

    // Default Subscription Mode
    var DEFAULT_MODE = 'event';

    // KeySpace Subscription Object
    var keyspaceSubscriptions = {};

    // KeySpace Status Object
    var keyspaceStatus = {};

    // KeySpace Authorizations
    var authorizedKeyspaces = {};

    // Channel Subscription Object
    var channelSubscriptions = {};

    // Channel User List Object
    var channelUserLists = {};

    // Channel User List Object
    var channelUserCounts = {};


    ClientSubscriptions.handleClientUserCount = function(responseString) {
        var match = /^(?:channel\.)?usercount\.(\w+)\s+(\S+)?\s+(\d+)$/im.exec(responseString);
        if (!match)
            throw new Error("Invalid UserCount: " + responseString);

        var mode = match[1].toLowerCase();
        var channel = match[2].toLowerCase();
        var subscriptionCount = parseInt(match[3]);

        if(typeof channelUserCounts[mode] === 'undefined')
            channelUserCounts[mode] = {};

        var modeChannels = channelUserCounts[mode];

        var oldUserCount = modeChannels[channel] || null;
        modeChannels[channel] = subscriptionCount;
        return oldUserCount;
    };

    // TODO: needs comments
    ClientSubscriptions.getChannelUserCount = function(channel, mode) {
        mode = mode.toLowerCase();
        channel = channel.toLowerCase();
        if(typeof channelUserCounts[mode] === 'undefined')
            return 0;
        var channelModes = channelUserCounts[mode];
        if(typeof channelModes[channel] === 'undefined')
            return 0;
        return channelModes[channel];
    };


    // TODO: needs comments
    ClientSubscriptions.handleClientUserList = function(responseString) {
        var match = /^(?:channel\.)?userlist\.(\S+)\s(\S+)\n([\s\S]+)$/im.exec(responseString);
        if (!match)
            throw new Error("Invalid UserList: " + responseString);

        var mode = match[1].toLowerCase();
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
    ClientSubscriptions.getChannelUserList = function(channel, mode) {
        mode = mode.toLowerCase();
        channel = channel.toLowerCase();
        if(typeof channelUserLists[mode] === 'undefined')
            return [];
        var channelModes = channelUserLists[mode];
        if(typeof channelModes[channel] === 'undefined')
            return [];
        return channelModes[channel];
    };

    // TODO: needs comments. These are examples for usage (that could be cleaned up):
    // CHANNEL.SUBSCRIBE.CHAT /state/az guest123
    // KEYSPACE.SUBSCRIBE.GET ABCD1234 <-- host keyspace content
    // KEYSPACE.SUBSCRIBE.PUT ABCD1234 <-- host keyspace service
    ClientSubscriptions.handleSubscriptionResponse = function(subscriptionString, e) {
        var match = /^(\w+)\.(|un|re)subscribe(?:\.(\S+))?\s+(\S+)\s*([\s\S]*)$/im.exec(subscriptionString);
        if (!match)
            throw new Error("Invalid Subscription: " + subscriptionString);

        var webSocket = e.target || null;

        var type = match[1].toLowerCase();
        var prefix = match[2].toLowerCase();
        var modeString = (match[3] || DEFAULT_MODE);
        var mode = modeString.toLowerCase();
        var argString = match[5];

        var subMode = null;
        if(mode.indexOf('.') > 0) {
            var modeSplit = modeString.split('.');
            mode = modeSplit.shift();
            subMode = modeSplit.join('.');
        }

        var modeList;
        switch(type) {
            case 'keyspaces':
                var kss = [], ksplit = [];
                argString = match[4] + (argString ? ' ' + argString : '');
                ksplit = argString.split(/\s+/g);
//                 console.log("Multiple subscribe: ", ksplit);
                for(var kspliti=0; kspliti<ksplit.length; kspliti++)
                    if(ksplit[kspliti].length > 0)
                        kss.push(
                            ClientSubscriptions.handleSubscriptionResponse(
                                'KEYSPACE.' + prefix.toUpperCase() + 'SUBSCRIBE.' + modeString.toUpperCase() +
                                ' ' + ksplit[kspliti],
                                e
                            )
                        );

                return ksplit;

            case 'keyspace':
                var pgp_id_public = match[4].toUpperCase();
                if(!/[a-f0-9]{8,}/i.exec(pgp_id_public))
                    throw new Error("Invalid PGP Public ID Key: " + pgp_id_public);
                if(typeof keyspaceSubscriptions[pgp_id_public] === 'undefined')
                    keyspaceSubscriptions[pgp_id_public] = {};
                modeList = keyspaceSubscriptions[pgp_id_public];

                switch (mode) {
                    case 'get':
                    case 'post':
                    case 'put':
                    case 'event':
                        break;
                    default:
                        throw new Error("Invalid KeySpace Mode: " + mode);
                }

                //ClientSubscriptions.getCachedPublicKeyUserID(pgp_id_public, function(user_id) {
                //    // do nothing on cache found
                //});

                break;

            case 'channels':
                // TODO: username for all channels?
                var css = [], csplit = [];
                argString = match[4] + (argString ? ' ' + argString : '');
                csplit = argString.split(/\s+/g);
                console.log("Multiple subscribe: ", csplit);
                for(var cspliti=0; cspliti<csplit.length; cspliti++)
                    if(csplit[cspliti].length > 0)
                        css.push(
                            ClientSubscriptions.handleSubscriptionResponse(
                                'CHANNEL.' + prefix.toUpperCase() + 'SUBSCRIBE.' + modeString.toUpperCase() +
                                ' ' + csplit[cspliti],
                                e
                            )
                        );

                return csplit;

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
            if(existingSubscriptionString === null)
                throw new Error("Old " + type + " Subscription not found: " + subscriptionString);
            delete modeList[mode];
            console.info(type + " subscription removed: ", subscriptionString);

        } else if(prefix === 're') {
            modeList[mode] = [argString, webSocket];
            if(existingSubscriptionString === null) {
                console.warn("Old Subscription not found: " + subscriptionString);

            } else {
                console.info(type + " subscription replaced: ", subscriptionString);

                if(typeof channelUserLists[mode] === 'undefined')
                    channelUserLists[mode] = {};
                var modeChannels = channelUserLists[mode];
                var oldUserList = modeChannels[channel] || null;
                var opos = oldUserList.indexOf(existingSubscriptionString.split(' ')[0]);
                if(opos >= 0) 
                    oldUserList[opos] = argString.split(' ')[0];
                else
                    console.warn("Username not found in userlist", existingSubscriptionString, oldUserList);

            }

        } else {
            modeList[mode] = [argString, webSocket];
            if(existingSubscriptionString === null) {
                console.info(type + " subscription: ", subscriptionString);
            } else {
                console.warn(type + " subscription replaced: ", subscriptionString);
                
                if(typeof channelUserLists[mode] === 'undefined')
                    channelUserLists[mode] = {};
                var modeChannels = channelUserLists[mode];
                var oldUserList = modeChannels[channel] || null;
                var opos = oldUserList.indexOf(existingSubscriptionString.split(' ')[0]);
                if(opos >= 0) 
                    oldUserList[opos] = argString.split(' ')[0];
                else
                    console.warn("Username not found in userlist", existingSubscriptionString, oldUserList);

            }
        }

        return existingSubscriptionString;
    };


    ClientSubscriptions.isKeySpaceAuthorized = function(pgp_id_public, withSocket) {
        if(typeof authorizedKeyspaces[pgp_id_public] === 'undefined')
            return false;

        if(!withSocket)
            return true;

        return authorizedKeyspaces[pgp_id_public].indexOf(withSocket) >= 0;
    };

    ClientSubscriptions.getAuthorizedKeySpaces = function() {
        var keyspaceList = [];
        for(var pgp_id_public in authorizedKeyspaces) {
            if(authorizedKeyspaces.hasOwnProperty(pgp_id_public)) {
                keyspaceList.push(pgp_id_public.toUpperCase());
            }
        }
        return keyspaceList;
    };

    ClientSubscriptions.handleKeySpaceAuthResponse = function(responseString, e) {
        var match = /^(?:keyspace\.)?auth(?:\.(challenge|success))?\s+([\s\S]+)$/im.exec(responseString);
        if (!match)
            throw new Error("Invalid Auth Response: " + responseString);

        var mode = match[1].toLowerCase();

        if(mode === 'success') {
            var auth_pgp_id_public = match[2];
            if(typeof authorizedKeyspaces[auth_pgp_id_public] === 'undefined')
                authorizedKeyspaces[auth_pgp_id_public] = [];

            if(authorizedKeyspaces[auth_pgp_id_public].indexOf(e.target) === -1)
                authorizedKeyspaces[auth_pgp_id_public].push(e.target);
            else
                console.warn("KeySpace already authenticated: " + auth_pgp_id_public);

            return;
        }

        var encryptedChallengeString = match[2];

        self.module = {exports: {}};
        importScripts('keyspace/passphrase/ks-client-passphrases.js');
        var ClientPassPhrases = self.module.exports.ClientPassPhrases;

        self.module = {exports: self.exports = {}};
        importScripts('pgp/lib/openpgpjs/openpgp.js');
        var openpgp = self.module.exports;

        var pgpEncryptedMessage = openpgp.message.readArmored(encryptedChallengeString);
        var pgp_id_public = pgpEncryptedMessage.getEncryptionKeyIds()[0].toHex().toUpperCase();

        var passphrase = null;
        ClientPassPhrases.requestDecryptedPrivateKey(pgp_id_public, passphrase,
            function(err, privateKey, passphrase) {
                if (err)
                    throw new Error(err);

                if(!privateKey.primaryKey.isDecrypted)
                    throw new Error("Primary Key wasn't really decrypted: " + pgp_id_public);

                // TODO: Why is this hack needed?
                var encryptionKeyIds = pgpEncryptedMessage.getEncryptionKeyIds();
                var privateKeyPacket = privateKey.getKeyPacket(encryptionKeyIds);
                if(passphrase)
                    privateKeyPacket.decrypt(passphrase);
                if(!privateKeyPacket.isDecrypted)
                    throw new Error("Subkey not decrypted");

                openpgp.decryptMessage(privateKey, pgpEncryptedMessage)
                    .then(function (decryptedChallenge) {
                        //challengeValidations.push([pgp_id_public, decryptedChallenge]);
                        ClientWorkerThread.sendWithSocket("KEYSPACE.AUTH.VALIDATE " + decryptedChallenge);

                    }).catch(function(err) {

                        console.error(err);
                    });
            }
        );

    };

    ClientSubscriptions.handleKeySpaceStatusResponse = function(responseString, e) {
        var match = /^keyspaces?\.status\s+(\S{2,256})\s+([a-f0-9 ]+)$/i.exec(responseString);
        if (!match)
            throw new Error("Invalid Status Command: " + responseString);

        var statusValue = match[1];
        var statusCommand = statusValue.split('.')[0].toLowerCase();
        var all_pgp_id_public = match[2].split(/\s+/g);

        for(var i=0; i<all_pgp_id_public.length; i++) {
            var pgp_id_public = all_pgp_id_public[i];
            pgp_id_public = pgp_id_public.toUpperCase().substr(pgp_id_public.length - 8);

            switch (statusCommand) {
                case 'online':
                case 'offline':
                case 'away':
                    break;
                default:
                    break;
            }

            var oldStatusArgString = null;
            if (typeof keyspaceStatus[pgp_id_public] !== 'undefined')
                oldStatusArgString = keyspaceStatus[pgp_id_public];

            keyspaceStatus[pgp_id_public] = statusValue;

            ClientWorkerThread.processResponse("EVENT " + responseString);
            // console.info("KeySpace Status Change for " + pgp_id_public + ": " + statusValue, "Old: ", oldStatusArgString);

        }
        return true;
    };

    ClientSubscriptions.getKeySpaceStatus = function(pgp_id_public) {
        pgp_id_public = pgp_id_public.toUpperCase().substr(pgp_id_public.length - 8);

        if(typeof keyspaceStatus[pgp_id_public] === 'undefined')
            return 'OFFLINE';

        return keyspaceStatus[pgp_id_public];
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
                        var ret = callback(pgp_id_public, mode, argString, webSocket);
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
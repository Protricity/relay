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
    ServerSubscriptions.handleClientSubscription = function(subscriptionString, client) {
        var match = /^(\w+)\.(|un|re)subscribe(?:\.(\w+))?\s+(\S+)\s*([\s\S]*)$/im.exec(subscriptionString);
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
            case 'keyspaces':
                var kss = [], ksplit = [];
                argString = match[4] + (argString ? ' ' + argString : '');
                ksplit = argString.split(/\s+/g);
                for(var kspliti=0; kspliti<ksplit.length; kspliti++)
                    if(ksplit[kspliti].length > 0)
                        kss.push(
                            ServerSubscriptions.handleClientSubscription(
                                'KEYSPACE.' +
                                prefix.toUpperCase() + 'SUBSCRIBE.' + mode.toUpperCase() +
                                ' ' + ksplit[kspliti],
                                client
                            )
                        );

                return ksplit;

            case 'keyspace':
                // This is a keyspace subscription, so the first arg is the PGP Public Key ID
                var pgp_id_public = match[4].toUpperCase();
                var id_match = /^(?:([A-F0-9]{8,})\s*)+$/i.exec(pgp_id_public);
                if(!id_match)
                    throw new Error("Invalid PGP Public ID Key: " + pgp_id_public);

                if(typeof keyspaceSubscriptions[pgp_id_public] === 'undefined')
                    keyspaceSubscriptions[pgp_id_public] = {};
                modeList = keyspaceSubscriptions[pgp_id_public];

                // Authentication may be required for certain (or all) subscriptions. Unauth-ed subscriptions still get
                switch (mode) {
                    case 'post':    // Auth required for handling POST requests from clients
                    case 'put':     // Auth required for PUT new content? Yes. Nothing should be PUT online without consent.
                        ServerSubscriptions.requestKeySpaceAuthentication(pgp_id_public, client, function() {
                            ServerSubscriptions.notifyAllAuthenticatedKeySpaceClients(pgp_id_public, "EVENT " + subscriptionString);
                        });
                        break;

                    case 'get':     // No auth required for GET. all GET requests are verified on the client (keyspace)
                    case 'event':   // No auth for status subscription
                        break;
                    default:
                        throw new Error("Invalid KeySpace Mode: " + subscriptionString);
                }

                // If this mode hasn't been defined yet, lets create the array
                if(typeof modeList[mode] === 'undefined')
                    modeList[mode] = [];

                // Set this mode list as the list to be modified
                clientList = modeList[mode];
                
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
                            ServerSubscriptions.handleClientSubscription(
                                'CHANNEL.' + prefix.toUpperCase() + 'SUBSCRIBE.' + type.toUpperCase() +
                                ' ' + csplit[cspliti],
                                client
                            )
                        );

                return csplit;

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
                //console.log(type + " subscription: ", subscriptionString);

            } else {
                // Replace the subscription
                clientList[oldPos] = [client, argString];
                console.warn(type + " subscription replaced: ", subscriptionString);
            }
        }

        //send(client, subscriptionString);

        // Return the old subscription, if found
        return oldSubscriptionString;
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
        return null;
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


    /** KeySpace Methods **/

    var keyspaceAuthentications = {};
    var keyspaceChallenges = {};
    var keyspaceRequests = {};

    ServerSubscriptions.hasKeySpaceAuthentication = function(pgp_id_public, client) {
        if(typeof keyspaceAuthentications[pgp_id_public] !== 'undefined') {
            if(keyspaceAuthentications[pgp_id_public].indexOf(client) >= 0) {
                return true;
            }
        }
        return false;
        //var authList = keyspaceAuthentications[pgp_id_public];
    };

    ServerSubscriptions.notifyAllAuthenticatedKeySpaceClients = function(pgp_id_public, commandString) {
        if(typeof keyspaceAuthentications[pgp_id_public] !== 'undefined') {
            var clients = keyspaceAuthentications[pgp_id_public];
            for(var j=0; j<clients.length; j++) {
                if(clients[j].readyState !== clients[j].OPEN) {
                    clients.splice(j--, 1);
                    continue;
                }
                clients[j].send(commandString);
            }

            console.info("O" + clients.length + " " + commandString);
        }
    };

    ServerSubscriptions.handleKeySpaceAuthenticationCommand = function(commandString, client) {
        var match = /^keyspaces?\.auth\.(validate)\s+([\s\S]+)$/i.exec(commandString);
        if (!match)
            throw new Error("Invalid Authentication Command: " + commandString);

        var subCommand = match[1];
        var hostCodes = match[2].split(/\s+/m);

        for(var i=0; i<hostCodes.length; i++) {
            var hostCode = hostCodes[i];

            if(typeof keyspaceChallenges[hostCode] === 'undefined') {
                send(client, "ERROR Host Code not found: " + hostCode);
                console.warn("Host Code not found: " + hostCode);
                continue;
            }

            var pgp_id_public = keyspaceChallenges[hostCode][0];
            var challengeClient = keyspaceChallenges[hostCode][1];
            var callback = keyspaceChallenges[hostCode][2];

            if(challengeClient !== client){
                send(client, "ERROR Client Mismatch: " + hostCode);
                throw new Error("ERROR Client Mismatch: " + hostCode);
            }
            //delete keySpaceChallenges[hostCode];

            if(typeof keyspaceAuthentications[pgp_id_public] !== 'undefined')
                keyspaceAuthentications[pgp_id_public] = [];
            var authList = keyspaceAuthentications[pgp_id_public];
            if(authList.indexOf(client) >= 0) {
                send(client, "ERROR Client already authenticated: " + pgp_id_public);
                console.warn("Client already authenticated: " + pgp_id_public);
                continue;
            }

            authList.push(client);
            send(client, "KEYSPACE.AUTH.SUCCESS " + pgp_id_public);

            if(callback)
                callback(pgp_id_public, client);

            ServerSubscriptions.notifyAllAuthenticatedKeySpaceClients(pgp_id_public,
                "EVENT KEYSPACE.AUTH.SUCCESS " + pgp_id_public);
        }
    };

    ServerSubscriptions.requestKeySpaceAuthentication = function(pgp_id_public, client, callback) {
        if(typeof keyspaceAuthentications[pgp_id_public] !== 'undefined') {
            if(keyspaceAuthentications[pgp_id_public].indexOf(client) >= 0) {
                if(callback)
                    callback(pgp_id_public, client);
                return true;
            }
        }

        ServerSubscriptions.requestClientPublicKey(pgp_id_public, client,
            function(err, publicKey) {

                if(err) {
                    console.error(err);
                    return send(client, "ERROR " + err);
                }
                // Generate new challenge
                var hostCode = generateUID('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');

                if(typeof keyspaceChallenges[hostCode] !== 'undefined')
                    throw new Error("Host Code already exists: " + hostCode);

                keyspaceChallenges[hostCode] = [pgp_id_public, client, callback];

                if(typeof openpgp === 'undefined')
                    var openpgp = require('openpgp');

                openpgp.encryptMessage(publicKey, hostCode)
                    .then(function(encryptedMessage) {
                        send(client, "KEYSPACE.AUTH.CHALLENGE " + encryptedMessage);
                        ServerSubscriptions.notifyAllAuthenticatedKeySpaceClients(pgp_id_public, "EVENT KEYSPACE.HOST.CHALLENGE " + encryptedMessage);

                    }).catch(function(error) {
                        send(client, "ERROR " + error);
                    });
            }
        );
    };

    ServerSubscriptions.requestClientPublicKey = function (pgp_id_public, client, callback) {
        var requestURL = "http://" + pgp_id_public + ".ks/public/id";
        console.info("Requesting Public Key from Client: " + requestURL);
        ServerSubscriptions.requestKeySpaceHTTPResponse(client, requestURL,
            function(hostClient, responseBody, responseCode, responseMessage, responseHeaders) {
                if(hostClient !== client) {
                    callback("Client Mismatch");
                    return send(client, "ERROR Client Mismatch");
                }

                if(responseCode !== 200) {
                    callback(responseCode + " " + responseMessage);
                    return send(client, "ERROR " + responseCode + " " + responseMessage);
                }

                var KeySpaceDB = require('../ks-db.js').KeySpaceDB;
                if(typeof openpgp === 'undefined')
                    var openpgp = require('openpgp');

                var publicKey = openpgp.key.readArmored(responseBody).keys[0];
                //var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;
                //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
                var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);
                if(publicKeyID !== pgp_id_public){
                    callback("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);
                    return send(client, "ERROR Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);
                }

                callback(null, publicKey);
            }
        );
    };

    ServerSubscriptions.requestKeySpaceHTTPResponse = function(client, requestURL, callback) {

        var requestID = "KA" + Date.now();
        if(typeof keyspaceRequests[requestID] !== 'undefined')
            throw new Error("Duplicate Request ID: " + requestID);

        keyspaceRequests[requestID] = callback;
        var requestString = "GET " + requestURL +
            "\nRequest-ID: " + requestID;

        send(client, requestString);
    };

    ServerSubscriptions.handleKeySpaceHTTPResponse = function(responseString, client) {
        var match = /^http\/1.1 (\d+)\s?([\w ]*)/i.exec(responseString);
        if(!match)
            throw new Error("Invalid HTTP Response: " + responseString);

        var responseCode = parseInt(match[1]);
        var responseMessage = match[2];

        var pos = responseString.indexOf("\n\n");
        var responseHeaders = responseString;
        var responseBody = null;
        if(pos > 0) {
            responseHeaders = responseString.substr(0, pos);
            responseBody = responseString.substr(pos+2);
        }

        var headerLines = responseHeaders.split(/\n/g);
        var firstLine = headerLines.shift();


        var requestID = null;
        for(var i=0; i<headerLines.length; i++) {
            var headerName = headerLines[i].split(' ')[0].toLowerCase();
            switch(headerName) {
                case 'request-id':
                    requestID = headerLines[i].split(' ', 2)[1];
                    break;
            }
        }

        if(requestID) {
            if(typeof keyspaceRequests[requestID] === 'undefined') {
                //send(client, "Unknown request ID: " + requestID);
                return false;
            }

            var callback = keyspaceRequests[requestID];
            delete keyspaceRequests[requestID];
            callback(client, responseBody, responseHeaders, responseCode, responseMessage);
            return true;
        }

        //send(client, "Unhandled Keyspace HTTP Response");
        return false;
    };

    function generateUID(format) {
        return (format).replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    function send(client, message) {
        client.send(message);
        console.info("O " + message);
    }

    // Return newly defined class
    return ServerSubscriptions;
})();
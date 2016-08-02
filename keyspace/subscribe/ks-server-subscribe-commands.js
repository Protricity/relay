/**
 * KeySpace Subscription Socket Commands
 * 
 * Provides server-side command handling for KEYSPACE.SUBSCRIBE
 */
 
if(typeof module === 'object') (function() {
   /**
     * Initiates Server Command Handlers for the server thread
     **/
    module.exports.initSocketServerKSSubscribeCommands = function (SocketServer) {
        SocketServer.addCommand(ksAuthSocketCommand);
        SocketServer.addCommand(ksHandleHTTPSocketResponse);

        SocketServer.addCommand(ksSubscribeSocketCommand);
        SocketServer.addCommand(ksUnsubscribeSocketCommand);
        console.log("Loaded " + __filename);

        //SocketServer.addClientEventListener('close', ksSocketClientCloseListener);
    };
})();

// Default mode, if unspecified
var DEFAULT_MODE = 'EVENT';

// Load ServerSubscriptions instance
var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

/**
 * Handles Command: KEYSPACE.AUTH
 * @param {string} commandString The command string to process 
 * @param {object} client The client sender instance
 * @return {boolean} true if handled otherwise false
 **/
function ksAuthSocketCommand(commandString, client) {
    var match = /^(?:keyspaces?\.)?auth/im.exec(commandString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler
    
    // Output to console
    console.info('I', commandString);
    
    ServerSubscriptions.handleKeySpaceAuthenticationCommand(commandString, client);
    return true;
}


/**
 * Handles Command: KEYSPACE.SUBSCRIBE[.mode] arg1 arg2...
 * @param {string} commandString The command string to process 
 * @param {object} client The client sender instance
 * @return {boolean} true if handled otherwise false
 **/
function ksSubscribeSocketCommand(commandString, client) {
    var match = /^(keyspaces?\.)?(un|re)?subscribe/i.exec(commandString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler
    
    // Output to console
    console.info('I', commandString);
    
    try {
        // Handle Subscription
        var oldSubscriptionString = ServerSubscriptions.handleClientSubscription(commandString, client);
        // TODO: should occur in ^
        send(client, commandString);

    } catch (e) {
        send(client, "ERROR " + e.message);
        return true;
    }
    
    // Command was handled
    return true;
}

/**
 * Handles Command: KEYSPACE.UNSUBSCRIBE[.mode] arg1 arg2...
 * @param {string} commandString The command string to process 
 * @param {object} client The client sender instance
 * @return {boolean} true if handled otherwise false
 **/
function ksUnsubscribeSocketCommand(commandString, client) {
    var match = /^(?:channel\.)?unsubscribe(?:\.(\w+))?\s+(\S+)$/im.exec(commandString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler
    
    // Output to console
    console.info('I', commandString);

    var mode = match[1] || DEFAULT_MODE;
    var channel = match[2];

    try {
        var oldArgString = ServerSubscriptions.handleClientSubscription(commandString, client);
        if(!oldArgString)
            throw new Error("Failed to unsubscribe: " + commandString);
        var oldUserName = oldArgString.split(/\s+/)[0];
        var relayCommandString = "CHANNEL.UNSUBSCRIBE." + mode.toUpperCase() + " " + channel + " " + oldUserName;
        var clients = ServerSubscriptions.getChannelSubscriptions(channel, mode);
        for(var i=0; i<clients.length; i++) {
            var channelClient = clients[i][0];
            if(channelClient.readyState === channelClient.OPEN) {
                // Inform other subscribers
                send(channelClient, relayCommandString);
            }
        }

    } catch (e) {
        send(client, "ERROR " + e.message);
        return true;
    }

    // Command was handled
    return true;
}

var pendingGETRequests = [];

/**
 * Handles Response: HTTP 1.1 [response code] [response message]
 * Note: Handles pending requests based on Request-ID
 * 
 * @param {string} responseString The response string to process 
 * @param {object} client The client sender instance
 * @return {boolean} true if handled otherwise false
 **/
function ksHandleHTTPSocketResponse(responseString, client) {
    var match = /^http\/1.1\s+(\d+)\s+(\w+)\s+/im.exec(responseString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler

    // Match response code and message
    var responseCode = match[1];
    var responseMessage = match[2];

    // Split the response into header and body
    var lines = responseString.split("\n\n", 2)[0].split(/\n/g);
    var firstLine = lines.shift();
    var responseHeaders = lines.join("\n");
    var responseBody = responseString.split("\n\n", 2)[1];

    // Search for Request-ID
    match = /^Request-ID:\s+(\w+)/im.exec(responseHeaders);
    if(!match)          // If no request ID is matched,
        return false;   // pass control to next handler

    // Match Request ID
    var requestID = match[1];


    if(typeof pendingGETRequests[requestID] === 'undefined')    // If Request ID wasn't found
        return false;   // pass control to next handler
        
    // Get pending request info
    var pendingGETRequest = pendingGETRequests[requestID];

    var pendingClient = pendingGETRequest[1];
    var pendingCallback = pendingGETRequest[2];
    
    // Check for client mismatch
    if(pendingClient !== client)
        throw new Error("Invalid request ID: Client mismatch");

    // Delete the request so it can't be reused
    delete pendingGETRequests[requestID];

    if(pendingCallback) // Trigger the pending callback
        pendingCallback(responseBody, responseCode, responseMessage, responseHeaders, client);

    // Command was handled
    return true;
}

/**
 * Send a message to a client
 * @param {object} client 
 * @param {string} message
 **/
function send(client, message) {
    if(client.readyState === client.OPEN) {
        client.send(message);
        console.info("O " + message);

    } else {
        console.warn("C " + message);
    }
}

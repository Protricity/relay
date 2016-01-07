/**
 * Created by ari.
 */

if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSGetCommands = function (SocketServer) {
        SocketServer.addCommand(getCommandSocket);
        SocketServer.addCommand(httpCommandSocket);
    };
    module.exports.initHTTPServerKSGetCommands = function (SocketServer) {
        SocketServer.addCommand(getCommandHTTP);
    };
})();

var ServerSubscriptions =
    require('../../server/subscriptions/server-subscriptions.js')
        .ServerSubscriptions;

var KeySpaceDB = require('../../keyspace/ks-db.js')
    .KeySpaceDB;

function httpCommandSocket(responseString, client) {
    var match = /^http/i.exec(responseString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler
    
    // Output to console
    console.info('I ', responseString);

    var ret = KeySpaceDB.handleHTTPResponse(responseString, client);
    if(ret === true) {
        // Add content to local database, if applicable
        if(typeof openpgp === 'undefined')
            var openpgp = require('openpgp');
        if(responseString.indexOf("\n\n") > 0) // Indicates a body
            KeySpaceDB.verifyAndAddContent(openpgp, responseString);
        return true;
    }

    send(client, "ERROR Unhandled HTTP Request [Probably No request ID]:\n" + responseString); // .split("\n")[0]
    return true;
}

function getCommandSocket(requestString, client) {
    var match = /^(head|get)\s+(\S*)/i.exec(requestString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler
    
    // Output to console
    console.info('I ', requestString);
    
    //var requestURL = match[2];

    KeySpaceDB.executeLocalGETRequest(requestString,
        function(responseBody, responseCode, responseMessage, responseHeaders) {
            if(responseCode === 200) {
                var responseString = 'HTTP/1.1 ' + (responseCode || 200) + ' ' + (responseMessage || 'OK') +
                    (responseHeaders ? "\n" + responseHeaders : '') +
                    (responseBody ? "\n\n" + responseBody : '');

                send(client, responseString);

            } else {
                // No content, so request content from subscribed hosts
                ServerSubscriptions.requestKeySpaceContentFromSubscribedHosts(KeySpaceDB, requestString, null,

                    function(responseBody, responseCode, responseMessage, responseHeaders, responseClient) {
                        var responseString = 'HTTP/1.1 ' + (responseCode || 200) + ' ' + (responseMessage || 'OK') +
                            (responseHeaders ? "\n" + responseHeaders : '') +
                            (responseBody ? "\n\n" + responseBody : '');

                        send(client, responseString);
                    }
                )
            }
        }
    );
    return true;
}

function getCommandHTTP(request, response) {
    var requestString = request.method + ' ' + request.url; // TODO: headers
    var match = /^get\s+(\S*)/i.exec(requestString);
    if (!match)         // If unmatched, 
        return false;   // Pass control to next handler
    
    // Output to console
    console.info('I ', requestString);

    var requestURL = match[1];
    KeySpaceDB.executeLocalGETRequest(requestString,
        function(responseBody, responseCode, responseMessage, responseHeaders) {
            if(responseCode === 200) {
                response.writeHead(responseCode || 200, responseHeaders || 'OK', respondingClient);
                response.end(responseBody);

            } else {
                ServerSubscriptions.requestKeySpaceContentFromSubscribedHosts(KeySpaceDB, requestString, null,
                    function(responseBody, responseCode, responseMessage, responseHeaders, respondingClient) {
                        response.writeHead(responseCode || 200, responseMessage || 'OK', responseHeaders);
                        response.end(responseBody);
                    }
                )
            }
        }
    );
    return true;
}


function send(client, message) {
    if(client.readyState === client.OPEN) {
        client.send(message);
        console.info("O " + message);

    } else {
        console.warn("C " + message);
    }
}
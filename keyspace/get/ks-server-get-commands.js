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

function httpCommandSocket(commandString, client) {
    var match = /^http/i.exec(commandString);
    if(!match)
        return false;

    if(KeySpaceDB.handleHTTPResponse(commandString, client) === true)
        return true;

    send(client, "Unhandled Keyspace HTTP Response");
    return true;
}

function getCommandSocket(commandString, client) {
    var match = /^(head|get)\s+(\S*)/i.exec(commandString);
    if(!match)
        return false;

    var requestURL = match[2];

    KeySpaceDB.executeLocalGETRequest(commandString,
        function(responseBody, responseCode, responseMessage, responseHeaders) {
            if(responseCode === 200) {
                var responseString = 'HTTP/1.1 ' + (responseCode || 200) + ' ' + (responseMessage || 'OK') +
                    (responseHeaders ? "\n" + responseHeaders : '') +
                    (responseBody ? "\n\n" + responseBody : '');

                send(client, responseString);

            } else {
                // No content, so request content from subscribed hosts
                ServerSubscriptions.requestKeySpaceContentFromSubscribedHosts(KeySpaceDB, requestURL, null,

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
    var commandString = request.method + ' ' + request.url;
    var match = /^get\s+(\S*)/i.exec(commandString);
    if(!match)
        return false;

    var requestURL = match[1];
    KeySpaceDB.executeLocalGETRequest(requestURL,
        function(responseBody, responseCode, responseHeaders, respondingClient) {
            if(responseCode === 200) {
                response.writeHead(responseCode || 200, responseHeaders || 'OK', respondingClient);
                response.end(responseBody);

            } else {
                ServerSubscriptions.requestKeySpaceContentFromSubscribedHosts(KeySpaceDB, requestURL, null,
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
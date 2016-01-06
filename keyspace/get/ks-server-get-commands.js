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

function httpCommandSocket(commandString, client) {
    var match = /^http/i.exec(commandString);
    if(!match)
        return false;

    var ret = ServerSubscriptions.handleKeySpaceHTTPResponse(commandString, client);
    if(ret === true)
        return true;

    send(client, "Unhandled Keyspace HTTP Response");
    return false;
}

function getCommandSocket(commandString, client) {
    var match = /^get\s+(\S*)/i.exec(commandString);
    if(!match)
        return false;

    var requestURL = match[1];
    executeServerGetRequest(requestURL, function(responseBody, statusCode, statusMessage, headers) {
        if(statusCode !== 200) {
            // No content, so request content from subscribed hosts
            ServerSubscriptions.requestKeySpaceContentFromSubscribedHosts(requestURL,
            
                function(hostClient, responseBody, responseCode, responseMessage, responseHeaders) {
                    var responseString = 'HTTP/1.1 ' + (responseCode || 200) + ' ' + (responseMessage || 'OK') +
                        (responseHeaders ? "\n" + responseHeaders : '') +
                        (responseBody ? "\n\n" + responseBody : '');

                    send(client, responseString);
                }
            )

        } else {
            send(client, 'HTTP/1.1 ' + (statusCode || 200) + ' ' + (statusMessage || 'OK') +
                (headers ? "\n" + headers : '') +
                (responseBody ? "\n\n" + responseBody : '')
            );
        }
    });
    return true;
}

function getCommandHTTP(request, response) {
    var commandString = request.method + ' ' + request.url;
    var match = /^get\s+(\S*)/i.exec(commandString);
    if(!match)
        return false;

    var requestURL = match[1];
    executeServerGetRequest(requestURL,
        function(responseBody, statusCode, statusMessage, headers) {
            if(statusCode !== 200) {
                ServerSubscriptions.requestKeySpaceContentFromSubscribedHosts(requestURL,
                    function(respondingClient, responseBody, statusCode, statusMessage, headers) {
                        response.writeHead(statusCode || 200, statusMessage || 'OK', headers);
                        response.end(responseBody);
                    }
                )

            } else {
                response.writeHead(statusCode || 200, statusMessage || 'OK', headers);
                response.end(responseBody);
            }
        }
    );
    return true;
}

function executeServerGetRequest(requestURL, callback) {

    var KeySpaceDB = require('../ks-db.js')
        .KeySpaceDB;

    KeySpaceDB.queryOne(requestURL, function (err, contentData) {

        if(err) {
            callback(
                err,
                400,
                err,
                "Content-Type: text/html\n" +
                "Content-Length: " + err.length + "\n" +
                "Request-URL: " + requestURL
            );
            throw new Error(err);
        }

        if(contentData) {
            // TODO: respond with content before querying keyspace hosts?
            callback(
                contentData.content,
                200,
                "OK",
                "Content-Type: text/html\n" +
                "Content-Length: " + contentData.content + "\n" +
                "Request-URL: " + requestURL
            );

        } else {
            callback(
                '',
                404,
                'Not Found',
                "Content-Type: text/html\n" +
                "Content-Length: 0\n" +
                "Request-URL: " + requestURL
            );
        }
    });
}


function send(client, message) {
    if(client.readyState === client.OPEN) {
        client.send(message);
        console.info("O " + message);

    } else {
        console.warn("C " + message);
    }
}
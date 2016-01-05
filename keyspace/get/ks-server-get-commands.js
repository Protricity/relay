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
    executeServerGetRequest(requestURL, function(err, responseBody, statusCode, statusMessage, headers) {
        if(!responseBody || err) {
            // No content, so request content from subscribed hosts
            ServerSubscriptions.requestKeySpaceContentFromSubscribedHosts(requestURL,
                function(err2, responseBody, statusCode, statusMessage, headers) {
                    if(!responseBody || err2) {
                        // Send error response
                        client.send('HTTP/1.1 ' + (statusCode || 400) + (statusMessage || err || err2) +
                            (headers ? "\n" + headers : '') +
                            "\n\n" + responseBody
                        );

                    } else {
                        // Send success response
                        client.send('HTTP/1.1 ' + (statusCode || 200) + (statusMessage || 'OK') +
                            (headers ? "\n" + headers : '') +
                            "\n\n" + responseBody
                        );
                    }
                }
            )

        } else {
            //client.send(responseBody);
            client.send('HTTP/1.1 ' + (statusCode || 200) + (statusMessage || 'OK') +
                (headers ? "\n" + headers : '') +
                "\n\n" + responseBody
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
    executeServerGetRequest(requestURL, function(err, responseBody, statusCode, statusMessage, headers) {
        if(err) {
            ServerSubscriptions.requestKeySpaceContentFromSubscribedHosts(requestURL,
                function(err, responseBody, statusCode, statusMessage, headers) {
                    response.writeHead(statusCode || 200, statusMessage || 'OK', headers);
                    response.end(responseBody);
                }
            )

        } else {
            response.writeHead(statusCode || 200, statusMessage || 'OK', headers);
            response.end(responseBody);
        }
    });
    return true;
}



var RESPONSE_BODY_TEMPLATE =
    "HTTP/1.1 {$response_code} {$response_text}\n" +
    "Content-Type: text/html\n" +
    "Content-Length: {$response_length}\n" +
    "Request-URL: {$request_url}" +
    "{$response_headers}" +
    "\n\n" +
    "{$response_body}";

var RESPONSE_BODY_TEMPLATE_404 =
    "HTTP/1.1 404 Not Found\n" +
    "Content-Type: text/html\n" +
    "Request-URL: {$request_url}" +
    "{$response_headers}";


function executeServerGetRequest(requestURL, callback) {

    var KeySpaceDB = require('../ks-db.js')
        .KeySpaceDB;

    KeySpaceDB.queryOne(requestURL, function (err, contentData) {
        var headers = '';

        if(err) {
            callback(err,
                RESPONSE_BODY_TEMPLATE
                    .replace(/{\$response_headers}/gi, headers)
                    .replace(/{\$response_code}/gi, 400)
                    .replace(/{\$response_text}/gi, err)
                    .replace(/{\$request_url}/gi, requestURL)
                    .replace(/{\$response_length}/gi, err.length)
                    .replace(/{\$response_body}/gi, err),
                400,
                err,
                headers
            );
            throw new Error(err);
        }

        if(contentData) {
            // TODO: respond with content before querying keyspace hosts?
            callback(null,
                RESPONSE_BODY_TEMPLATE
                .replace(/{\$response_headers}/gi, headers)
                .replace(/{\$response_code}/gi, 200)
                .replace(/{\$response_text}/gi, 'OK')
                .replace(/{\$request_url}/gi, requestURL)
                .replace(/{\$response_length}/gi, contentData.content.length)
                .replace(/{\$response_body}/gi, contentData.content),
                400,
                err,
                headers
            );

        } else {
            callback(null,
                RESPONSE_BODY_TEMPLATE_404
                    .replace(/{\$response_headers}/gi, headers)
                    .replace(/{\$request_url}/gi, requestURL),
                400,
                err,
                headers
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
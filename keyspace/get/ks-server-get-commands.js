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

    var ret = handleKeySpaceHTTPRequest(commandString, client);
    if(ret === true)
        return true;
    ret = ServerSubscriptions.handleKeySpaceHTTPResponse(commandString, client);
    if(ret === true)
        return true;

    send(client, "Unhandled Keyspace HTTP Response");
    return false;
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

function getCommandSocket(commandString, client) {
    var match = /^get\s+(\S*)/i.exec(commandString);
    if(!match)
        return false;

    var requestURL = match[1];
    executeServerGetRequest(requestURL, function(err, responseBody, statusCode, statusMessage, headers) {
        if(err) {
            requestGetFromSubscribedHosts(requestURL,
                function(err, responseBody, statusCode, statusMessage, headers) {

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
            requestGetFromSubscribedHosts(requestURL,
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

var clientKeySpaceRequests = {};
function requestGetFromSubscribedHosts(requestURL, callback) {
    var hostClients = ServerSubscriptions.getKeySpaceSubscriptions(pgp_id_public, "GET");
    for(var i=0; i<hostClients.length; i++) {
        if(hostClients[i].readyState !== hostClients[i].OPEN) {
            hostClients.splice(i--, 1);
        } else {
            var commandString = "GET " + requestURL;
            hostClients.send(commandString);
        }
    }

    if(hostClients.length === 0) {
        callback("No KeySpace Hosts Available");
        return;
    }
    console.info("Requested Keyspace content from (" + hostClients.length + ") Host Clients: " + requestURL);
    var requestURLID = requestURL.split('?')[0].toLowerCase();
    if(typeof clientKeySpaceRequests[requestURLID] === 'undefined')
        clientKeySpaceRequests[requestURLID] = [];
    clientKeySpaceRequests[requestURLID].push(callback);
}
// TODO: move to server subscriptinos duh
function handleKeySpaceHTTPRequest(responseString, client) {
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

    return false;
}

//function handleHTTPSocketResponse(responseString, client) {
//    if(responseString.substr(0,4).toLowerCase() !== 'http')
//        return false;
//
//    var referrerURL = getContentHeader(responseString, 'Request-Url');
//    if(!referrerURL)
//        throw new Error("Unknown Request-Url for response: Header is missing");
//
//    addURLsToDB(responseString, referrerURL);
//
//    var status = getResponseStatus(responseString);
//    var responseBody = getResponseBody(responseString);
//    var responseHeaders = getResponseHeaders(responseString);
//    var responseCode = status[0];
//    var responseMessage = status[1];
//    if(responseCode === 200) {
//
//        var requestID = getContentHeader(responseString, 'Request-ID');
//        if(typeof pendingGETRequests[requestID] === 'undefined')
//            throw new Error("Request ID not found: " + responseString);
//
//        var pendingGetRequest = pendingGETRequests[requestID];
//        delete pendingGETRequests[requestID];
//
//        var pendingCommand = pendingGetRequest[0];
//        var pendingClient = pendingGetRequest[1];
//        var pendingCallback = pendingGetRequest[2];
//        if(pendingClient !== client)
//            throw new Error("Invalid request ID: Client mismatch");
//        if(pendingCallback)
//            pendingCallback(responseBody, responseCode, responseMessage, responseHeaders);
//
//    } else {
//        throw new Error("Handle 404: " + responseString);
//        // Handle 404 request
//    }
//    return true;
//}

function executeServerGetRequest(requestURL, callback) {
    console.warn("TODO: query all clients: ", requestURL);

    var KeySpaceDB = require('../ks-db.js').KeySpaceDB;

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
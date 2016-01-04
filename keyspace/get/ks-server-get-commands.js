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
    var match = /^get\s+/i.exec(commandString);
    if(!match)
        return false;

    executeServerGetRequest(commandString, function(responseBody, statusCode, statusMessage, headers) {
        client.send(responseBody);
        //client.send('HTTP/1.1 ' + (statusCode || 200) + (statusMessage || 'OK') +
        //    (headers ? "\n" + headers : '') +
        //    "\n\n" + responseBody
        //);
    });
    return true;
}

function getCommandHTTP(request, response) {
    var commandString = request.method + ' ' + request.url;
    var match = /^get\s+/i.exec(commandString);
    if(!match)
        return false;

    executeServerGetRequest(commandString, function(responseBody, statusCode, statusMessage, headers) {
        response.writeHead(statusCode || 200, statusMessage || 'OK', headers);
        response.end(responseBody);
    });
    return true;
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

function executeServerGetRequest(requestString, callback) {
    var browserID = getContentHeader(requestString, 'Browser-ID');
    //if(!browserID)
    //    requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

    console.warn("TODO: query all clients: ", requestString);
    //// TODO: Query all client hosts
    //var requestID = 'S' + requestIDCount++;
    //requestString = addContentHeader(requestString, 'Request-ID', requestID);
    //pendingGETRequests[requestID] = [callback, client]; // TODO: reuse same callback? should be fine.
    //Client.sendWithSocket(requestString);

    // Check local cache to see what can be displayed while waiting
    var requestURL = getRequestURL(requestString);
    //console.info("GET ", requestURL);

    var KeySpaceDB = require('../ks-db.js').KeySpaceDB;

    KeySpaceDB.queryOne(requestURL, function (err, contentData) {
        if(err)
            throw new Error(err);

        if(contentData) {
            // TODO: respond with content before querying keyspace hosts?
            require('./response/render/ks-response.js')
                .renderResponse(
                    contentData.content,
                    requestURL,
                    200,
                    "OK",
                    (browserID ? "Browser-ID: " + browserID : ''),
                    callback
                );
        }
    });
}


// Request/Response methods

function getRequestURL(requestString) {
    var firstLine = requestString.split(/\n/)[0];
    var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/i.exec(firstLine);
    if(!match)
        throw new Error("Invalid GET Request: " + requestString);
    return match[1];
}

// TODO: ignore body
function getContentHeader(contentString, headerName) {
    var match = new RegExp('^' + headerName + ': ([^$]+)$', 'mi').exec(contentString.split(/\n\n/)[0]);
    if(!match)
        return null;
    return match[1];
}

function send(client, message) {
    if(client.readyState === client.OPEN) {
        client.send(message);
        console.info("O " + message);

    } else {
        console.warn("C " + message);
    }
}
/**
 * Created by ari.
 */

if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSGetCommands = function (SocketServer) {
        SocketServer.addCommand(getCommandSocket);
        //SocketServer.addCommand(handleHTTPSocketResponse);
    };
    module.exports.initHTTPServerKSGetCommands = function (SocketServer) {
        SocketServer.addCommand(getCommandHTTP);
    };
})();

var httpBrowserID = 1;

function getCommandSocket(commandString, client) {
    var match = /^get\s+/i.exec(commandString);
    if(!match)
        return false;

    executeServerGetRequest(commandString, function(responseBody) {
        client.send(responseBody);
        //client.send('HTTP/1.1 ' + (statusCode || 200) + (statusMessage || 'OK') +
        //    (headers ? "\n" + headers : '') +
        //    "\n\n" + responseBody
        //);
    });
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

//function addURLsToDB(responseContent, referrerURL) {
//    var KeySpaceDB = require('../ks-db.js').KeySpaceDB;
//
//    responseContent.replace(/<a[^>]+href=['"]([^'">]+)['"][^>]*>([^<]+)<\/a>/gi, function(match, url, text, offset, theWholeThing) {
//        KeySpaceDB.addURLToDB(url, referrerURL);
//    });
//}

function getResponseBody(responseString) {
    getResponseStatus(responseString);
    return responseString.split("\n\n", 2)[1];
}

function getResponseHeaders(responseString) {
    getResponseStatus(responseString);
    var lines = responseString.split("\n\n", 2)[0].split(/\n/g);
    lines.shift();
    return lines.join("\n");
}

function getResponseStatus(responseString) {
    var match = /^http\/1.1 (\d+) ?(.*)$/im.exec(responseString);
    if(!match)
        throw new Error("Invalid HTTP Response: " + responseString);
    return [parseInt(match[1]), match[2]];
}

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

function addContentHeader(contentString, headerName, headerValue) {
    if(getContentHeader(contentString, headerName))
        throw new Error("Content already has Header: " + headerName);
    var lines = contentString.split(/\n/);
    lines.splice(lines.length >= 1 ? 1 : 0, 0, headerName + ": " + headerValue);
    return lines.join("\n");
}
//
//function generateUID(format) {
//    return (format).replace(/[xy]/g, function(c) {
//        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
//        return v.toString(16);
//    });
//}
//

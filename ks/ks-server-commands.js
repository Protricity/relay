/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};

exports.initSocketServerCommands = function(SocketServer) {
    SocketServer.addCommand(getCommandSocket);
    SocketServer.addCommand(putCommandSocket);
    SocketServer.addCommand(httpCommandSocket);
};

exports.initHTTPServerCommands = function(HTTPServer) {
    HTTPServer.addCommand(getCommandHTTP);
    HTTPServer.addCommand(putCommandHTTP);

};

function getCommandSocket(commandString, client) {
    var match = /^get\s+/i.exec(commandString);
    if(!match)
        return false;

    executeGETRequest(commandString, function(responseBody, statusCode, statusMessage, headers) {
        client.send('HTTP/1.1 ' + (statusCode || 200) + (statusMessage || 'OK') +
            (headers ? "\n" + headers : ''),
            "\n\n" + responseBody
        );
    });
}

function getCommandHTTP(request, response) {
    var commandString = request.method + ' ' + request.url;
    var match = /^get\s+/i.exec(commandString);
    if(!match)
        return false;

    executeGETRequest(commandString, function(responseBody, statusCode, statusMessage, headers) {
        response.writeHead(statusCode || 200, statusMessage || 'OK', headers);
        response.end(responseBody);
    });
}


function putCommandSocket(commandString, client) {
    var match = /^put(?:\s+([\s\S]+))$/i.exec(commandString);
    if(!match)
        return false;

    var content = match[1];

    throw new Error(content);
}

function putCommandHTTP(request, response) {
    var commandString = request.method + ' ' + request.url;
    var match = /^put(?:\s+([\s\S]+))$/i.exec(commandString);
    if(!match)
        return false;

    var content = match[1];

    throw new Error(content);
}


function httpCommandSocket(commandString, client) {
    return httpCommand(commandString);
}

function httpCommandHTTP(commandString, client) {
    return httpCommand(commandString);
}

// TODO: default content on response http only?
function httpCommand(commandString) {
    if(commandString.substr(0,4).toLowerCase() !== 'http')
        return false;

    var referrerURL = getContentHeader(commandString, 'Request-Url');
    if(!referrerURL)
        throw new Error("Unknown Request-Url for response: Header is missing");

    addURLsToDB(commandString, referrerURL);

    var responseCode = getResponseStatus(commandString)[0];
    if(responseCode === 200) {
        // TODO: store/cache

    } else {
        // Handle 404 request
    }
    return true;
}

function addURLsToDB(responseContent, referrerURL) {
    responseContent.replace(/<a[^>]+href=['"]([^'">]+)['"][^>]*>([^<]+)<\/a>/gi, function(match, url, text, offset, theWholeThing) {
        getKeySpaceDB().addURLToDB(url, referrerURL);
    });
}

var httpBrowserID = 1;
var requestIDCount = 0;
var pendingGETRequests = {};
function executeGETRequest(requestString, callback) {
    var browserID = getContentHeader(requestString, 'Browser-ID');
    if(!browserID)
        requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

    // TODO: Query all client hosts
    //var requestID = 'R' + requestIDCount++;
    //requestString = addContentHeader(requestString, 'Request-ID', requestID);
    //pendingGETRequests[requestID] = callback; // TODO: reuse same callback? should be fine.
    //Client.sendWithSocket(requestString);

    // Check local cache to see what can be displayed while waiting
    var requestURL = getRequestURL(requestString);
    console.info("GET ", requestURL);
    getKeySpaceDB().queryContent(requestURL, function (err, contentData) {
        if(err)
            throw new Error(err);

        if(contentData) {
            // TODO: respond with content before querying keyspace hosts?
            importScripts('ks/templates/ks-response-template.js');
            Templates.ks.response.body(
                contentData.content,
                requestURL,
                200,
                "OK",
                "Browser-ID: " + browserID,
                callback
            );
            // Free up template resources
            delete Templates.ks.response.body;

        }
    });
}

// Request/Response methods

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

function getKeySpaceDB() {
    if(typeof self.KeySpaceDB === 'undefined') {
        if(typeof importScripts === "function")
            importScripts('ks/ks-db.js');
        else
            self.KeySpaceDB = require('./ks-db.js').KeySpaceDB;
    }
    return self.KeySpaceDB;
}

exports.test = function() {
    console.log('Test Complete: ' + __filename);
};

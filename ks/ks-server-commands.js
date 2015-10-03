/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};

exports.initSocketServerCommands = function(SocketServer) {
    SocketServer.addCommand(getCommandSocket);
    SocketServer.addCommand(putCommandSocket);
    SocketServer.addCommand(handleHTTPSocketResponse);
    SocketServer.addEventListener('connection', onSocketConnection);
};

exports.initHTTPServerCommands = function(HTTPServer) {
    HTTPServer.addCommand(getCommandHTTP);
    HTTPServer.addCommand(putCommandHTTP);

};

function onSocketConnection(client) {

    requestClientPublicKey(client, "282B9974B85CF365", function(publicKey) {
        var publicKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
        console.error("TODO: Handle PubKey Response", publicKeyID);
    });
}

function requestClientPublicKey(client, pgp_id_public, callback) {
    if(pgp_id_public.length < 16)
        throw new Error("Invalid PGP Key ID (16): " + pgp_id_public);

    var requestPath = "/public/id";
    var requestURL = "http://" + pgp_id_public + ".ks" + requestPath;
    var loaded = false;
    getKeySpaceDB().queryContent(requestURL, function (err, contentData) {
        if (err)
            throw new Error(err);
        if(loaded)
            return;

        if (contentData) {
            if(typeof openpgp === 'undefined')
                var openpgp = require('openpgp');
            var publicKey = openpgp.key.readArmored(contentData.content).keys[0];
            var publicKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
            if(publicKeyID !== pgp_id_public)
                throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

            callback(publicKey, contentData.content);
            console.info("Loaded Public Key from Cache: " + requestURL);
            loaded = true;

        } else {
            console.info("Requesting Public Key from Client: " + requestURL);
            sendClientRequest("GET " + requestURL, client, function(responseBody, responseCode, responseMessage, responseHeaders) {
                if(typeof openpgp === 'undefined')
                    var openpgp = require('openpgp');
                var publicKey = openpgp.key.readArmored(responseBody).keys[0];
                var publicKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
                if(publicKeyID !== pgp_id_public)
                    throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

                callback(publicKey, responseBody);

                // TODO: client config cache settings
                // TODO: correct timestamp
                // Cache
                getKeySpaceDB().addVerifiedContentToDB(publicKey.armor(), pgp_id_public, requestPath, Date.now(), {},
                    function(err, insertData) {
                        if(err)
                            throw new Error(err);

                        loaded = true;
                        console.info("Cached: " + requestURL);
                    });
            });
        }
    });
}

function sendClientRequest(commandString, client, callback) {
    var requestID = getContentHeader(commandString, 'Request-ID') || null;
    if(!requestID) {
        requestID = 'S' + Date.now();
        commandString = addContentHeader(commandString, 'Request-ID', requestID);
    }
    pendingGETRequests[requestID] = [commandString, client, callback]; // TODO: reuse same callback? should be fine.
    client.send(commandString);
}

function getCommandSocket(commandString, client) {
    var match = /^get\s+/i.exec(commandString);
    if(!match)
        return false;

    executeServerGetRequest(commandString, function(responseBody, statusCode, statusMessage, headers) {
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

    executeServerGetRequest(commandString, function(responseBody, statusCode, statusMessage, headers) {
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

// TODO: default content on response http only?
function handleHTTPSocketResponse(responseString, client) {
    if(responseString.substr(0,4).toLowerCase() !== 'http')
        return false;

    var referrerURL = getContentHeader(responseString, 'Request-Url');
    if(!referrerURL)
        throw new Error("Unknown Request-Url for response: Header is missing");

    addURLsToDB(responseString, referrerURL);

    var status = getResponseStatus(responseString);
    var responseBody = getResponseBody(responseString);
    var responseHeaders = getResponseHeaders(responseString);
    var responseCode = status[0];
    var responseMessage = status[1];
    if(responseCode === 200) {

        var requestID = getContentHeader(responseString, 'Request-ID');
        if(typeof pendingGETRequests[requestID] === 'undefined')
            throw new Error("Request ID not found: " + responseString);

        var pendingGetRequest = pendingGETRequests[requestID];
        delete pendingGETRequests[requestID];

        var pendingCommand = pendingGetRequest[0];
        var pendingClient = pendingGetRequest[1];
        var pendingCallback = pendingGetRequest[2];
        if(pendingClient !== client)
            throw new Error("Invalid request ID: Client mismatch");
        if(pendingCallback)
            pendingCallback(responseBody, responseCode, responseMessage, responseHeaders);

    } else {
        throw new Error("Handle 404: " + responseString);
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
function executeServerGetRequest(requestString, callback) {
    var browserID = getContentHeader(requestString, 'Browser-ID');
    if(!browserID)
        requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

    //// TODO: Query all client hosts
    //var requestID = 'S' + requestIDCount++;
    //requestString = addContentHeader(requestString, 'Request-ID', requestID);
    //pendingGETRequests[requestID] = [callback, client]; // TODO: reuse same callback? should be fine.
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

function getKeySpaceDB() {
    if(typeof KeySpaceDB === 'undefined') {
        if(typeof importScripts === "function")
            importScripts('ks/ks-db.js');
        else
            return require('./ks-db.js').KeySpaceDB;
    }
    return KeySpaceDB;
}

exports.test = function() {
    console.log('Test Complete: ' + __filename);
};

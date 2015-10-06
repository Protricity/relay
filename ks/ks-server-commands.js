/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};

exports.initSocketServerCommands = function(SocketServer) {
    SocketServer.addCommand(getCommandSocket);
    SocketServer.addCommand(putCommandSocket);
    SocketServer.addCommand(ksAuthCommandSocket);
    SocketServer.addCommand(ksValidateCommandSocket);
    SocketServer.addCommand(handleHTTPSocketResponse);
    //SocketServer.addEventListener('connection', onSocketConnection);
};

exports.initHTTPServerCommands = function(HTTPServer) {
    HTTPServer.addCommand(getCommandHTTP);
    HTTPServer.addCommand(putCommandHTTP);

};

var keySpaceClients = {};
var keySpaceChallenges = {};
function ksAuthCommandSocket(commandString, client) {
    var match = /^ks-auth\s+(.*)$/i.exec(commandString);
    if(!match)
        return false;

    var ids = match[1].split(/\W+/);
    for(var i=0; i<ids.length; i++) {
        var id = ids[i];
        if(id.length < 16) {
            client.send("ERROR PGP ID must be at least 16 characters: " + id);

        } else {
            sendKeySpaceAuth(id, client);
        }
    }
    return true;
}

function ksValidateCommandSocket(commandString, client) {
    var match = /^ks-validate\s+(.*)?$/i.exec(commandString);
    if(!match)
        return false;

    var uid = match[1];
    if(!keySpaceChallenges[uid])
        throw new Error("Invalid Validation Key");

    var pgp_id_public = keySpaceChallenges[uid];
    delete keySpaceChallenges[uid];
    console.log("Validation Success: " + pgp_id_public + " => " + uid);
    if(typeof keySpaceClients[pgp_id_public] === 'undefined')
        keySpaceClients[pgp_id_public] = [];
    var clientEntries = keySpaceClients[pgp_id_public];
    if(clientEntries.indexOf(client) >= 0) {
        client.send("WARN Already hosting key space " + pgp_id_public);

    } else {
        clientEntries.push(client);
        client.send("INFO Hosting key space " + pgp_id_public);
    }
    return true;
}

function sendKeySpaceAuth(pgp_id_public, client) {
    if(typeof keySpaceClients[pgp_id_public] === 'undefined')
        keySpaceClients[pgp_id_public] = [];

    var clientEntries = keySpaceClients[pgp_id_public];
    if(clientEntries.indexOf(client) >= 0)
        throw new Error("Already hosting key space " + pgp_id_public);

    // Generate new challenge
    var authCode = generateUID('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
    keySpaceChallenges[authCode] = pgp_id_public;

    requestClientPublicKey(pgp_id_public, client, function(err, publicKey) {
        if(err)
            return client.send("ERROR " + err);

        if(typeof openpgp === 'undefined')
            var openpgp = require('openpgp');

        openpgp.encryptMessage(publicKey, authCode)
            .then(function(encryptedMessage) {
                client.send("KS-CHALLENGE " + encryptedMessage);

            }).catch(function(error) {
                client.send("ERROR " + error);
            });
    });
}

function requestClientPublicKey(pgp_id_public, client, callback) {
    if(pgp_id_public.length < 16)
        throw new Error("Invalid PGP Key ID (16): " + pgp_id_public);

    var requestPath = "/public/id";
    var requestURL = "http://" + pgp_id_public + ".ks" + requestPath;
    var loaded = false;
    getKeySpaceDB().queryOne(requestURL, function (err, contentData) {
        if (err)
            return callback(err);

        if(loaded)
            return;

        if (contentData) {
            if(typeof openpgp === 'undefined')
                var openpgp = require('openpgp');
            var publicKey = openpgp.key.readArmored(contentData.content).keys[0];
            var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
            if(publicKeyID !== pgp_id_public)
                throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

            callback(null, publicKey, contentData.content);
            //console.info("Loaded Public Key from Cache: " + requestURL);
            loaded = true;

        } else {
            console.info("Requesting Public Key from Client: " + requestURL);
            sendClientRequest("GET " + requestURL, client, function(responseBody, responseCode, responseMessage, responseHeaders) {
                if(typeof openpgp === 'undefined')
                    var openpgp = require('openpgp');
                var publicKey = openpgp.key.readArmored(responseBody).keys[0];
                var publicKeyCreateDate = publicKey.subKeys[0].subKey.created;
                //var privateKeyID = publicKey.primaryKey.getKeyId().toHex().toUpperCase();
                var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                if(publicKeyID !== pgp_id_public)
                    throw new Error("Public Key ID mismatch: " + publicKeyID + " !== " + pgp_id_public);

                callback(null, publicKey, responseBody);

                // TODO: client config cache settings
                // Cache Public Key
                getKeySpaceDB().addVerifiedContentToDB(publicKey.armor(), pgp_id_public, requestPath, publicKeyCreateDate.getTime(), {},
                    function(err, insertData) {
                        if(err)
                            throw new Error(err);

                        loaded = true;
                        console.info("Storing Public Key Cache: " + requestURL);
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
    //console.info("GET ", requestURL);
    getKeySpaceDB().queryOne(requestURL, function (err, contentData) {
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

function generateUID(format) {
    return (format).replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
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

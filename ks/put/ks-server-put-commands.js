/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initSocketServerKSPutCommands = function(SocketServer) {
    SocketServer.addCommand(putCommandSocket);
};
module.exports.initHTTPServerKSGetCommands = function(SocketServer) {
    SocketServer.addCommand(putCommandHTTP);
};


function putCommandSocket(commandString, client) {
    var match = /^put\s+(\w+)\s+([\s\S]+)$/i.exec(commandString);
    if(!match)
        return false;

    var pgp_id_public = match[1] || null;
    var content = match[2];

    var KeySpaceDB = require('./ks-db.js').KeySpaceDB;

    // Only encrypted messages will be accepted
    var openpgp = require('openpgp');
    var pgpMessage = openpgp.cleartext.readArmored(content);
    var pgpSignedContent = pgpMessage.armor();

    KeySpaceDB.verifyAndAddContentToDB(
        pgpSignedContent,
        pgp_id_public,
        function (err, insertData) {
            if (err)
                throw new Error(err);

            client.send("PUT.SUCCESS " + insertData.pgp_id_public + ' ' + insertData.timestamp);
        }
    );

    return true;
}

function putCommandHTTP(request, response) {
    var commandString = request.method + ' ' + request.url;
    var match = /^put(?:\s+([\s\S]+))$/i.exec(commandString);
    if(!match)
        return false;

    var content = match[1];


    throw new Error(content);
}

/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initSocketServerCommands = function(SocketServer) {
    //SocketServer.addCommand(function (commandString, client) {
    //    if(commandString.substr(0, 3).toLowerCase() !== 'get')
    //        return false;
    //
    //    handleFileRequest(commandString, function(responseBody, statusCode, statusMessage, headers) {
    //        client.send('HTTP/1.1 ' + (statusCode || 200) + (statusMessage || 'OK') +
    //            (headers ? "\n" + headers : ''),
    //            "\n\n" + responseBody
    //        );
    //
    //    });
    //});

    SocketServer.addCommand(pgpAuth);
    SocketServer.addCommand(pgpAuthValidate);
};

exports.initHTTPServerCommands = function(HTTPServer) {
};


function onSocketClient(newClient) {
    if(newClient.pgp)
        throw new Error("PGP Client already initiated");

    newClient.pgp = {};
    newClient.pgp.id_public = '_';
    newClient.pgp.uid = generateUID(SESSION_UID);
    console.log("Initiated new PGP Client: " + newClient);
    send(newClient, "UID " + newClient.pgp.uid);
}


var SESSION_UID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
function generateUID(format) {
    return (format).replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function pgpAuth(commandString, client) {
    var match = /^pgp-auth\s+(.*)?$/i.exec(commandString);
    if(!match)
        throw new Error("Invalid command: " + commandString);

    var ids = match[1].split(/\W+/);
    for(var i=0; i<ids.length; i++) {
        var id = ids[i];
        console.log("PGP IDENTIFY " + id);
    }

}

function pgpAuthValidate(commandString, client) {
    //var publicKeyBlock = parsePublicKeyBlock(commandString);
    //var signedIDSIGBlock = parseSignedMessage(commandString);
    //var publicKeys = openpgp.key.readArmored(commandString);
    //var clearSignedMessages = openpgp.cleartext.readArmored(commandString);
    console.log(commandString);
    //send(client, "IDENTIFY " + client.pgp.uid);
}

function send(client, message) {
    client.send(message);
    console.info("O " + message);
}


function parsePublicKeyBlock(content) {

    var tag = "-----BEGIN PGP PUBLIC KEY BLOCK-----";
    var sPos = content.indexOf(tag);
    if(sPos == -1)
        throw new Error("No " + tag + " found");

    tag = "-----END PGP PUBLIC KEY BLOCK-----";
    var fPos = content.indexOf(tag, sPos);
    if(fPos == -1)
        throw new Error("No " + tag + " found");
    fPos += tag.length;
    return content.substring(sPos, fPos);
}

function parseSignedMessage(content, pos) {
    var tag = "-----BEGIN PGP SIGNED MESSAGE-----";
    var sPos = content.indexOf(tag, pos);
    if(sPos == -1)
        throw new Error("No " + tag + " found");

    tag = "-----BEGIN PGP SIGNATURE-----";
    var mPos = content.indexOf(tag, sPos);
    if(mPos == -1)
        throw new Error("No " + tag + " found");

    tag = "-----END PGP SIGNATURE-----";
    var fPos = content.indexOf(tag, mPos);
    if(fPos == -1)
        throw new Error("No " + tag + " found");
    fPos += tag.length;

    return content.substring(mPos, fPos);
}
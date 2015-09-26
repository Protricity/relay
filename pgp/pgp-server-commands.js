/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initSocketServerCommands = function(SocketServer) {
    SocketServer.addCommand(pgpAuth);
    SocketServer.addCommand(pgpAuthValidate);
    SocketServer.addCommand(getPGPPublicKey);
};

exports.initHTTPServerCommands = function(HTTPServer) {
};

exports.test = function() {

};

// TODO listings and variables
// TODO: calculate domain names that resolve to key ids
// TODO: D4819140521D4941.ks + [] => myspace.az12332432523.nks - [] => D4819140521D4941.ks
// TODO: 521D4941.ks + [] => myspace.abc123.nks - [] => 521D4941.ks
// http://D4819140521D4941.ks/@pgp/@export
// http://D4819140521D4941.ks/@pgp/index.html
// http://D4819140521D4941.ks/@chat/@username

// socket://D4819140521D4941.pks/@pgp/@export
// socket://2059093A15CD3775648464B6D4819140521D4941.ks/@pgp/@export

function getPGPPublicKey(commandString, client) {
    var match = /^get (?:socket:\/\/)?([a-f0-9]{8,})(?:\.ks)(\/@pgp.*)$/i.exec(commandString);
    if(!match)
        return false;

    var keyID = match[1];
    var path = match[2];

    console.log("PUBLIC KEY", match);
}

function pgpAuth(commandString, client) {
    var match = /^pgp-auth\s+(.*)?$/i.exec(commandString);
    if(!match)
        return false;

    var ids = match[1].split(/\W+/);
    for(var i=0; i<ids.length; i++) {
        var id = ids[i];
        console.log("     PGP IDENTIFY " + id);
    }
    return true;
}

function pgpAuthValidate(commandString, client) {
    var match = /^pgp-auth-validate\s+(.*)?$/i.exec(commandString);
    if(!match)
        return false;

    //var publicKeyBlock = parsePublicKeyBlock(commandString);
    //var signedIDSIGBlock = parseSignedMessage(commandString);
    //var publicKeys = openpgp.key.readArmored(commandString);
    //var clearSignedMessages = openpgp.cleartext.readArmored(commandString);
    console.log(commandString);
    //send(client, "IDENTIFY " + client.pgp.uid);
    return true;
}

function send(client, message) {
    client.send(message);
    console.info("O " + message);
}


//
//var SESSION_UID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
//function generateUID(format) {
//    return (format).replace(/[xy]/g, function(c) {
//        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
//        return v.toString(16);
//    });
//}

//
//function parsePublicKeyBlock(content) {
//
//    var tag = "-----BEGIN PGP PUBLIC KEY BLOCK-----";
//    var sPos = content.indexOf(tag);
//    if(sPos == -1)
//        throw new Error("No " + tag + " found");
//
//    tag = "-----END PGP PUBLIC KEY BLOCK-----";
//    var fPos = content.indexOf(tag, sPos);
//    if(fPos == -1)
//        throw new Error("No " + tag + " found");
//    fPos += tag.length;
//    return content.substring(sPos, fPos);
//}
//
//function parseSignedMessage(content, pos) {
//    var tag = "-----BEGIN PGP SIGNED MESSAGE-----";
//    var sPos = content.indexOf(tag, pos);
//    if(sPos == -1)
//        throw new Error("No " + tag + " found");
//
//    tag = "-----BEGIN PGP SIGNATURE-----";
//    var mPos = content.indexOf(tag, sPos);
//    if(mPos == -1)
//        throw new Error("No " + tag + " found");
//
//    tag = "-----END PGP SIGNATURE-----";
//    var fPos = content.indexOf(tag, mPos);
//    if(fPos == -1)
//        throw new Error("No " + tag + " found");
//    fPos += tag.length;
//
//    return content.substring(mPos, fPos);
//}
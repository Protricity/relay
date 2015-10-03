/**
 * Created by ari on 9/22/2015.
 */
if(!exports) var exports = {};
exports.initSocketServerCommands = function(SocketServer) {
    //SocketServer.addCommand(pgpAuth);
    //SocketServer.addCommand(pgpAuthValidate);
};

exports.initHTTPServerCommands = function(HTTPServer) {
};

exports.test = function() {

};


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
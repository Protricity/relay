/**
 * Ari 7/2/2015.
 */
if (!module) var module = {exports:{}};
module.exports.initClientPGPKeyGenCommand = function(Client) {
    Client.addCommand(keygenCommand);

    /**
     * @param commandString PGP.KEYGEN --bits [2048] --pass [passphrase] --user [user id]
     */
    function keygenCommand(commandString, e) {
        var match = /^pgp.keygen\s*(.+)?$/im.exec(commandString);
        if(!match)
            return false;

        var content = match[1] || '';
        if(content) {
            var bits = 2048;
            content = content.replace(/--bits (\d+)/i, function(match, contents, offset, s) {
                bits = parseInt(contents); return '';
            });

            var passphrase = null;
            content = content.replace(/--pass(?:phrase)? ([^-]+)/i, function(match, contents, offset, s) {
                passphrase = contents.trim(); return '';
            });

            var userID = content.trim();
            content.replace(/--user ([^-]+)/i, function(match, contents, offset, s) {
                userID = contents; return '';
            });

            self.exports = {};
            self.module = {exports: {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            openpgp.generateKeyPair({
                keyType:1,
                numBits:bits,
                userId:userID,
                passphrase:passphrase

            }).then(function(keyPair) {
                var privateKey = keyPair.key;
                var newPrivateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
                var newPublicKeyID = privateKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
                console.log("New PGP Key Generated: ", newPrivateKeyID, newPublicKeyID);

                //registerCommand("REGISTER " + keyPair.privateKeyArmored);

                var userIDString = privateKey.getUserIds().join('; ');

                //var publicKeyBlock = publicKey.armor();

                var status_content = "\
                    <span class='success'>PGP Key Pair generated successfully</span><br/><br/>\n\
                    <span class='info'>You may now register the following identity:</span><br/>\n\
                    User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>\n\
                    Private Key ID: <strong>" + newPrivateKeyID + "</strong><br/>\n\
                    Public Key ID: <strong>" + newPublicKeyID + "</strong><br/>\n\
                    Passphrase: <strong>" + (privateKey.primaryKey.isDecrypted ? 'No' : 'Yes') + "</strong><br/>";

                self.module = {exports: {}};
                importScripts('pgp/register/render/pgp-register-form.js');
                var templateExports = self.module.exports;
                templateExports.renderPGPRegisterForm(keyPair.privateKeyArmored, status_content, function(html) {
                    Client.render(html);
                });
                return true;

            });

            return true;

        } else {
            self.module = {exports: {}};
            importScripts('pgp/keygen/render/pgp-keygen-form.js');
            var templateExports = self.module.exports;

            templateExports.renderPGPKeyGenForm('', function(html) {
                Client.render(html);
            });

            return true;
        }
    }

};


//
    //
    //var identifyRequests = [];
    ///**
    // * @param commandData IDENTIFY --session [session-uid]
    // */
    //Client.addCommand(function (commandString, e) {
    //    var match = /^identify\s+(.*)$/im.exec(commandString);
    //    if(!match)
    //        return false;
    //
    //    if(identifyRequests.length === 0)
    //        throw new Error("No IDENTIFY REQUESTS received");
    //
    //    var identifyRequest = identifyRequests[0];
    //    var responseString = identifyRequest[0];
    //    var socket = identifyRequest[1];
    //
    //    var ConfigDB = getConfigDB();
    //    ConfigDB.getConfig(CONFIG_ID, function(err, CONFIG) {
    //        if(err)
    //            throw new Error(err);
    //
    //        importScripts('pgp/templates/pgp-identify-template.js.old');
    //        Templates.pgp.identify.form(responseString, socket.url, CONFIG, function(html) {
    //            Client.postResponseToClient("RENDER.REPLACE identify: " + html);
    //        });
    //        // Free up template resources
    //        delete Templates.pgp.identify;
    //    });
    //    return true;
    //});

    //
    ///**
    // * @param responseString [challenge_string] [session_id]
    // */
    //Client.addResponse(function (responseString, e) {
    //    var match = /^identify\s+(.*)$/im.exec(commandString);
    //    if(!match)
    //        return false;
    //    var socket = e.target;
    //    identifyRequests.push([responseString, socket]);
    //    Client.execute("IDENTIFY");
    //    return true;
    //
    //    //ConfigDB.getConfig(CONFIG_ID, function(CONFIG) {
    //    //    var socket_host = socket.url.split('/')[2];
    //    //var autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
    //    //});
    //});

//
//    /**
//     * @param commandData IDSIG [challenge-string] [session-id] [pgp-key-id] [username] [visibility]
//     */
//    Client.addResponse(function (commandData, e) {
//        var match = /^idsig\s+(.*)$/im.exec(commandString);
//        if(!match)
//            return false;
//
//        var split = commandData.split(/\s+/g);
//        if(split[0].toUpperCase() !== 'IDSIG')
//            throw new Error("Invalid IDSIG: " + commandData);
//
//        var pgp_id_public = split[1];
//        var session_uid = split[2];
//        var username = split[3];
//        var visibility = split[4];
//
//        var status_content =
//            "<label><strong>User ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='user'>" + username + "</span><br/></label>" +
//            "<label><strong>PGP Key ID:&nbsp;&nbsp;&nbsp;</strong> <span class='pgp-id'>" + pgp_id_public + "</span><br/></label>" +
//            "<label><strong>Session ID:&nbsp;&nbsp;&nbsp;</strong> <span class='session-uid'>" + session_uid + "</span><br/></label>" +
//            "<label><strong>Visibility:&nbsp;&nbsp;&nbsp;</strong> <span class='visibility'>" + visibility + "</span><br/></label>" +
//            "<div class='idsig' style='padding: 1em'>" + commandData + "</div>";
//
//        var ConfigDB = getConfigDB();
//        ConfigDB.getConfig(CONFIG_ID, function(err, CONFIG) {
//            if(err)
//                throw new Error(err);
//
//            for (var j = 0; j < identifyRequests.length; j++) (function(identifyRequest) {
//                if (identifyRequest[0].indexOf("IDENTIFY " + session_uid) !== -1) {
//                    var socket = identifyRequest[1];
//                    var socket_host = socket.url.split('/')[2];
//
//                    var auto_identify_host_attr = '';
//                    var auto_identify_all_attr = '';
//                    var autoIdentify = false;
//                    if(CONFIG) {
//                        autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
//                        if(CONFIG['autoIdentifyHost:' + socket_host])
//                            auto_identify_host_attr = "selected='selected'";
//                        else if(CONFIG['autoIdentify'])
//                            auto_identify_all_attr = "selected='selected'";
//                    }
//
//                    importScripts('pgp/templates/pgp-identify-template.js.old');
//                    Templates.pgp.identify.successForm(commandData, socket.url, CONFIG, function(html) {
//                        Client.postResponseToClient("RENDER.REPLACE identify: " + html);
//                    });
//                    // Free up template resources
//                    delete Templates.pgp.identify;
//
//                    //var PGPDB = getPGPDB();
//                    //PGPDB(function (db) {
//                    //    var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
//                    //    var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);
//                    //
//                    //    var index = privateKeyStore.index('id_public');
//                    //    var req = index.get(pgp_id_public);
//                    //    req.onsuccess = function (evt) {
//                    //        var privateKeyData = evt.target.result;
//                    //        if(!privateKeyData)
//                    //            throw new Error("Could not find private key: " + privateKeyID);
//                    //        var pgp_id_private = privateKeyData.id_private + "," + privateKeyData.id_public + "," + username + (privateKeyData.passphrase_required ? ',1' : ',0');
//                    //
//                    //        Client.postResponseToClient("RENDER.REPLACE " + PATH_ID_REQUEST + " * " + IDENTIFY_TEMPLATE_SUCCESS
//                    //                .replace(/{\$pgp_id_public}/gi, pgp_id_public)
//                    //                .replace(/{\$pgp_id_private}/gi, pgp_id_private)
//                    //                .replace(/{\$status_content}/gi, status_content || '')
//                    //                .replace(/{\$socket_url}/gi, socket.url || '')
//                    //                .replace(/{\$socket_host}/gi, socket.url.split('/')[2] || '')
//                    //                .replace(/{\$session_uid}/gi, session_uid || '')
//                    //                .replace(/{\$auto_identify_host_attr}/gi, auto_identify_host_attr || '')
//                    //                .replace(/{\$auto_identify_all_attr}/gi, auto_identify_all_attr || '')
//                    //            //.replace(/{\$[^}]+}/gi, '')
//                    //        );
//                    //    };
//                    //});
//
////                     console.info("Removing IDENTIFY request: ", identifyRequest);
//                    identifyRequests.splice(j, 1);
//                    j--;
//                }
//            })(identifyRequests[j]);
//
//
//            getPGPDB(function(db) {
//               PGPDB.addIDSIGToDatabase(commandData, function(err, sessionData) {
//                    if(err)
//                        throw new Error(err);
//
//               }) ;
//            });
//        });
//    });


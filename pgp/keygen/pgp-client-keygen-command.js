/**
 * Ari 7/2/2015.
 */
if (!module) var module = {exports:{}};
module.exports.initClientPGPKeyGenCommand = function(Client) {
    Client.addCommand(keygenCommand);

    /**
     * @param commandString
     */
    function pgpAuthCommand(commandString) {
        var match = /^pgp-auth/i.exec(commandString);
        if(!match)
            return false;

        // TODO: all or select sockets
        Client.sendWithSocket(commandString); // sendSocket
        return true;
    }

    /**
     * @param commandString
     */
    function pgpAuthValidateCommand(commandString) {
        var match = /^pgp-auth-validate\s+(\w{8,})/im.exec(commandString);
        if(!match)
            return false;

        console.log(commandString);
        return true;
    }


    /**
     * @param commandString
     * @param status_content
     */
    function manageCommand(commandString, e, status_content) {
        var match = /^manage/i.exec(commandString);
        if(!match)
            return false;

        var templateExports = require('pgp/manage/render/pgp-manage-form.js');

        templateExports.renderPGPManageForm(status_content, function(html) {
            Client.render(html);

        });
        return true;
    }


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
            //var openpgp = require('pgp/lib/openpgpjs/openpgp.js');
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

                var templateExports = require('pgp/register/render/pgp-register-form.js');
                templateExports.renderPGPRegisterForm(keyPair.privateKeyArmored, status_content, function(html) {
                    Client.render(html);
                });
                return true;

            });

            return true;

        } else {
            var templateExports = require('pgp/keygen/render/pgp-keygen-form.js');

            templateExports.renderPGPKeyGenForm('', function(html) {
                Client.render(html);
            });

            return true;
        }
    }

    /**
     * @param commandString REGISTER
     */
    function registerCommand(commandString, e) {
        var match = /^register\s*([\s\S]+)?$/im.exec(commandString);
        if(!match)
            return false;

        // TODO: require passphrase on register?

        if(match[1]) {
            self.exports = {};
            self.module = {exports: {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            self.module = {exports: {}};
            importScripts('ks/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            var privateKeyBlock = (match[1] || '').replace(/(\r\n|\r|\n)/g, '\r\n');
            var privateKey = openpgp.key.readArmored(privateKeyBlock).keys[0];
            var privateKeyID = privateKey.primaryKey.getKeyId().toHex().toUpperCase();
            privateKeyID = privateKeyID.substr(privateKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var publicKey = privateKey.toPublic();
            var publicKeyID = publicKey.subKeys[0].subKey.getKeyId().toHex().toUpperCase();
            var publicKeyBlock = publicKey.armor();
            publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

            var userIDString = privateKey.getUserIds().join('; ');

            var customFields = {
                pgp_id_private: privateKeyID,
                user_id: userIDString,
                passphrase_required: privateKey.primaryKey.isDecrypted ? false : true
            };

            var path = '/.private/id';
            KeySpaceDB.addVerifiedContentToDB(privateKeyBlock, publicKeyID, path, Date.now(), customFields, function(err, insertData) {
                if(err)
                    throw new Error(err);

                var customFields = {
                    pgp_id_private: privateKeyID,
                    user_id: userIDString
                };

                var path = '/public/id';
                KeySpaceDB.addVerifiedContentToDB(publicKeyBlock, publicKeyID, path, Date.now(), customFields, function(err, insertData) {
                    if(err)
                        throw new Error(err);

                    var status_content = "\
                        <span class='success'>PGP Key Pair registered successfully</span><br/><br/>\n\
                        <span class='info'>You may now make use of your new identity:</span><br/>\n\
                        User ID: <strong>" + userIDString.replace(/</g, '&lt;') + "</strong><br/>";

                    require('pgp/manage/render/pgp-manage-form.js')
                        .renderPGPManageForm(status_content, function(html) {
                            Client.replace('pgp:', html);
                        });

                });
            });
            return true;

        } else {
            var status_content = "Paste a new PGP PRIVATE KEY BLOCK to register a new PGP Identity manually";

            var templateExports = require('pgp/register/render/pgp-register-form.js');
            templateExports.renderPGPRegisterForm('', status_content, function(html) {
                Client.render(html);
            });
            // Free up template resources
            delete Templates.pgp.register;
            return true;

        }
    }


    /**
     * @param commandString UNREGISTER [PGP Private Key Fingerprint]
     */
    function unregisterCommand(commandString, e) {
        var match = /^unregister\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        var publicKeyIDs = match[1].trim().split(/\W+/g);
        for(var i=0; i<publicKeyIDs.length; i++) {
            (function (publicKeyID) {
                publicKeyID = publicKeyID.substr(publicKeyID.length - KeySpaceDB.DB_PGP_KEY_LENGTH);

                // Query private key(s)
                var privateKeyPath = 'http://' + publicKeyID + '.ks/.private/id';
                KeySpaceDB.queryOne(privateKeyPath, function(err, privateKeyData) {
                    if(err)
                        throw new Error(err);
                    if(privateKeyData) {
                        KeySpaceDB.deleteContent(privateKeyData.pgp_id_public, privateKeyData.timestamp, function(err) {
                            if(err)
                                throw new Error(err);
                            console.info("PGP Identity deleted successfully: " + privateKeyData.user_id);
                            manageCommand("MANAGE", e, "<span class='success'>PGP Identity deleted successfully</span>: " + privateKeyData.user_id + "<br/>Public Key ID: " + publicKeyID);
                        });
                    } else {
                        console.error("Not found: " + publicKeyID);
                    }
                });
            })(publicKeyIDs[i]);
        }
        return true;
    }

    /**
     * @param commandString DEFAULT [PGP Private Key Fingerprint]
     */
    function commandDefault(commandString, e) {
        var match = /^default\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        var publicKeyID = match[1].trim().split(/\W+/g)[0];
        publicKeyID = publicKeyID.substr(publicKeyID.length - 16);
        console.log("TODO: default", publicKeyID);
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


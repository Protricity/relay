/**
 * Ari 7/2/2015.
 */
(function() {


    var CONFIG_ID = 'pgp';

    var PATH_PREFIX = 'pgp:';
    var PATH_MAIN = PATH_PREFIX + 'main';
    var PATH_ID_REQUEST = PATH_PREFIX + 'identify';

    var USE_SOCKET_PGP_KEYGEN = false;

    /**
     * @param commandString
     */
    Client.addCommand(function (commandString) {
        var match = /^pgp-auth/i.exec(commandString);
        if(!match)
            return false;

        // TODO: all or select sockets
        Client.sendWithSocket(commandString); // sendSocket
        return true;

        //var keyID = match[1].toUpperCase();
        //
        //if(typeof PGPDB !== 'function')
        //    importScripts('pgp/pgp-db.js');
        //PGPDB.getPublicKeyData(keyID, function(publicKeyData) {
        //    if(!publicKeyData)
        //        throw new Error("Could not find Public Key: " + keyID);
        //
        //    //commandString = 'pgp-identify ' + publicKeyData.block_public;
        //
        //
        //});
    });

    /**
     * @param commandString
     */
    Client.addCommand(function (commandString) {
        var match = /^pgp-auth-validate\s+(\w{8,})/im.exec(commandString);
        if(!match)
            return false;


        console.log(commandString);
        return true;
    });

    Client.addResponse(function (responseString) {
        var match = /^get (?:socket:\/\/)?([a-f0-9]{8,})(?:\.ks)(\/@pgp.*)$/i.exec(responseString);
        if(!match)
            return false;

        var keyID = match[1];
        var path = match[2];

        console.log("PUBLIC KEY", match);
        return true;
    }, true);

    /**
     * @param commandString
     * @param status_content
     */
    Client.addCommand(function (commandString) {
        var match = /^key\s+(\w{8,})/im.exec(commandString);
        if(!match)
            return false;

        var keyID = match[1].toUpperCase();

        if(typeof PGPDB !== 'function')
            importScripts('pgp/pgp-db.js');

        PGPDB.getPublicKeyData(keyID, function(publicKeyData) {
            if(!publicKeyData)
                publicKeyData = {
                    id_public: keyID,
                    user_id: null,
                    block_public: null
                };

            importScripts('pgp/templates/pgp-public-key-template.js');
            Templates.pgp.key.form(publicKeyData, function(html, className) {
                Client.postResponseToClient("LOG.REPLACE " + className + " " + html);
            });
            // Free up template resources
            delete Templates.pgp.key.form;
        });
        return true;
    });

    /**
     * @param commandString
     * @param status_content
     */
    Client.addCommand(function (commandString, e, status_content) {
        var match = /^manage/i.exec(commandString);
        if(!match)
            return false;

        importScripts('pgp/templates/pgp-manage-template.js');
        Templates.pgp.manage.form(status_content, function(html) {
            Client.postResponseToClient("LOG.REPLACE pgp-manage: " + html);
        });

        var PGPDB = getPGPDB();
        PGPDB.queryPrivateKeys(function(data) {
            Templates.pgp.manage.entry(data, function(html) {
                Client.postResponseToClient("LOG pgp-manage-entries: " + html);
            });
        }, function() {

            // Free up template resources
            delete Templates.pgp.manage;
        });
        return true;
    });


    /**
     * @param commandString KEYGEN --bits [2048] [user id]
     */
    Client.addCommand(function (commandString, e) {
        var match = /^keygen ?(.+)?$/im.exec(commandString);
        if(!match)
            return false;

        var content = match[1] || '';
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

        var kbpgp = getKBPGP();
        var send_as_socket_command = USE_SOCKET_PGP_KEYGEN;
        if(send_as_socket_command && typeof crypto === 'undefined' || crypto.polyfill === true) {
            console.warn("Crypto is undefined within the WebWorker. Falling back to client-side cryptography");
            send_as_socket_command = false;
        }

        if(!userID || !send_as_socket_command) {
            importScripts('pgp/templates/pgp-generate-template.js');
            Templates.pgp.generate.form(userID, send_as_socket_command, function(html) {
                Client.postResponseToClient("LOG.REPLACE pgp: " + html);
            });
            // Free up template resources
            delete Templates.pgp.generate;
            return;
        }

        var F = kbpgp["const"].openpgp;

        var opts = {
            userid: userID,
            primary: {
                nbits: bits,
                flags: F.certify_keys | F.sign_data | F.auth | F.encrypt_comm | F.encrypt_storage,
                expire_in: 0  // never expire
            },
            subkeys: [
                {
                    nbits: bits/2,
                    flags: F.sign_data,
                    expire_in: 86400 * 365 * 8 // 8 years
                }, {
                    nbits: bits/2,
                    flags: F.encrypt_comm | F.encrypt_storage,
                    expire_in: 86400 * 365 * 8
                }
            ]
        };

        kbpgp.KeyManager.generate(opts, function(err, alice) {
            if (!err) {
                // sign alice's subkeys
                alice.sign({}, function(err) {
                    console.log(alice);
                    // export demo; dump the private with a passphrase

                    alice.armored_pgp_private = null;
                    alice.export_pgp_private ({
                        passphrase: passphrase
                    }, function(err, privateKeyBlock) {
                        if(err)
                            throw new Error(err);
                        console.log("private key: ", err, privateKeyBlock);

                        importScripts('pgp/templates/pgp-register-template.js');
                        Templates.pgp.register.form(privateKeyBlock, '', function(html) {
                            Client.postResponseToClient("LOG.REPLACE pgp: " + html);
                        });
                        // Free up template resources
                        delete Templates.pgp.register;

                    });

                    alice.armored_pgp_public = null;
                    alice.export_pgp_public({}, function(err, pgp_public) {
                        console.log("public key: ", pgp_public);


                    });
                });
            }
        });
        return true;
    });

    /**
     * @param commandString REGISTER
     */
    Client.addCommand(function (commandString, e) {
        var match = /^register\s*([\s\S]*)$/im.exec(commandString);
        if(!match)
            return false;

        var status_content = '';
        var privateKeyBlock = (match[1] || '').replace(/(\r\n|\r|\n)/g, '\r\n');

        var showForm = false;
        if(!privateKeyBlock) {
            showForm = true;

        } else {
            privateKeyBlock = privateKeyBlock.replace(/--show-form\s*/i, function (match, contents, offset, s) {
                showForm = true; return '';
            });
        }

        if(showForm) {
            if(privateKeyBlock) {
                var kbpgp = getKBPGP();

                kbpgp.KeyManager.import_from_armored_pgp({
                    armored: privateKeyBlock
                }, function(err, alice) {
                    if (err)
                        throw new Error(err);

                    var privateKey = alice.find_crypt_pgp_key();
                    var privateKeyFingerprint = privateKey.get_fingerprint().toString('hex').toUpperCase();
                    var publicKey = alice.find_signing_pgp_key();
                    var publicKeyFingerprint = publicKey.get_fingerprint().toString('hex').toUpperCase();
                    var userID = alice.userids[0];
                    var userIDString = "" + userID.get_username()
                        + (userID.get_comment() ? ' ' + userID.get_comment() : '')
                        + (userID.get_email() ? " <" + userID.get_email() + ">" : '');

                    status_content =
                        "Ready to <span class='command'>register</span> new PGP Identity:<br/>\n" +
                        "User ID: " + userIDString + "<br/>\n" +
                        "Private Key ID: " + privateKeyFingerprint + "<br/>\n" +
                        "Public Key ID:  " + publicKeyFingerprint + "<br/>\n";

                    importScripts('pgp/templates/pgp-register-template.js');
                    Templates.pgp.register.form(privateKeyBlock, status_content, function(html) {
                        Client.postResponseToClient("LOG.REPLACE pgp: " + html);
                    });
                    // Free up template resources
                    delete Templates.pgp.register;
                });

            } else {
                status_content = "<span class='info'>Paste a new PGP PRIVATE KEY BLOCK to register a new PGP Identity manually</span>";
                importScripts('pgp/templates/pgp-register-template.js');
                Templates.pgp.register.form(privateKeyBlock, '', function(html) {
                    Client.postResponseToClient("LOG.REPLACE pgp: " + html);
                });
                // Free up template resources
                delete Templates.pgp.register;
            }
        } else {

            var PGPDB = getPGPDB();
            PGPDB.addPrivateKeyBlock(privateKeyBlock, function(err, data) {
                console.log(data);
                if(err) {
                    importScripts('pgp/templates/pgp-register-template.js');
                    Templates.pgp.register.form(privateKeyBlock, err, function(html) {
                        Client.postResponseToClient("LOG.REPLACE pgp: " + html);
                    });
                    // Free up template resources
                    delete Templates.pgp.register;
                } else {
                    Client.manage("MANAGE");

                }
            });
        }
        return true;
    });


    /**
     * @param commandString UNREGISTER [PGP Private Key Fingerprint]
     */
    Client.addCommand(function (commandString) {
        var match = /^unregister\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;
        var privateKeyFingerprints = match[1].trim().split(/\W+/g);
        for(var i=0; i<privateKeyFingerprints.length; i++) {
            (function (privateKeyFingerprint) {
                var privateKeyID = privateKeyFingerprint.substr(privateKeyFingerprint.length - 16);

                var PGPDB = getPGPDB();
                PGPDB(function (db) {
                    var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
                    var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

                    var insertRequest = privateKeyStore.delete(privateKeyID);
                    insertRequest.onsuccess = function (e) {
                        var status_content = "Deleted private key block from database: " + privateKeyID;
                        console.log(status_content);
                        Client.manage("MANAGE", e, status_content);

                    };
                    insertRequest.onerror = function (e) {
                        var err = e.currentTarget.error;
                        var status_content = "Error adding private key (" + privateKeyID + ") database: " + err.message;
                        console.error(status_content, e);
                        Client.manage("MANAGE", e, status_content);

                    };
                });
            })(privateKeyFingerprints[i]);
        }
        return true;
    });

    /**
     * @param commandString DEFAULT [PGP Private Key Fingerprint]
     */
    Client.addCommand(function (commandString, e) {
        var match = /^default\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        var privateKeyFingerprint = match[1].trim().split(/\W+/g)[0];
        var privateKeyID = privateKeyFingerprint.substr(privateKeyFingerprint.length - 16);

        var PGPDB = getPGPDB();
        PGPDB(function (db) {
            var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
            var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

            var req = privateKeyStore.get(privateKeyID);
            req.onsuccess = function (evt) {
                var privateKeyData = evt.target.result;
                if(!privateKeyData)
                    throw new Error("Could not find private key: " + privateKeyID);

                var index = privateKeyStore.index('default');
                var getRequest = index.get('1');
                getRequest.onsuccess = function (evt) {
                    var oldDefaultPrivateKeyData = evt.target.result;

                    if(oldDefaultPrivateKeyData) {
                        console.log("Resetting Default PK: ", oldDefaultPrivateKeyData);
                        oldDefaultPrivateKeyData.default = '0';
                        privateKeyStore.put(oldDefaultPrivateKeyData);
                    }

                    privateKeyData.default = '1';
                    var updateRequest = privateKeyStore.put(privateKeyData);
                    updateRequest.onsuccess = function(event) {
                        Client.manage("MANAGE", e, "Private Key ID set to default: " + privateKeyFingerprint);
                    };
                };
            };
        });
    });


    var identifyRequests = [];
    /**
     * @param commandData IDENTIFY --session [session-uid]
     */
    Client.addCommand(function (commandString, e) {
        var match = /^identify\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        if(identifyRequests.length === 0)
            throw new Error("No IDENTIFY REQUESTS received");

        var identifyRequest = identifyRequests[0];
        var responseString = identifyRequest[0];
        var socket = identifyRequest[1];

        var ConfigDB = getConfigDB();
        ConfigDB.getConfig(CONFIG_ID, function(err, CONFIG) {
            if(err)
                throw new Error(err);

            importScripts('pgp/templates/pgp-identify-template.js');
            Templates.pgp.identify.form(responseString, socket.url, CONFIG, function(html) {
                Client.postResponseToClient("LOG.REPLACE identify: " + html);
            });
            // Free up template resources
            delete Templates.pgp.identify;
        });
        return true;
    });


    /**
     * @param responseString [challenge_string] [session_id]
     */
    Client.addResponse(function (responseString, e) {
        var match = /^identify\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;
        var socket = e.target;
        identifyRequests.push([responseString, socket]);
        Client.execute("IDENTIFY");
        return true;

        //ConfigDB.getConfig(CONFIG_ID, function(CONFIG) {
        //    var socket_host = socket.url.split('/')[2];
        //var autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
        //});
    });

    //
    ///**
    // * @param commandData IDSIG [idsig and public key content]
    // */
    //Client.addCommand('idsig', function (commandData, e) {
    //    if(typeof commandData === 'string')
    //        commandData = {message: commandData, passphrase: null};
    //    var commandString = commandData.message;
    //
    //    if(identifyRequests.length === 0)
    //        throw new Error("No IDENTIFY REQUESTS received");
    //
    //    var match = /^idsig\s?([\s\S]*)$/im
    //        .exec(commandString);
    //    if(!match)
    //        throw new Error("Could not match idsig content");
    //    var identifyContent = match[1] || '';
    //
    //    match = /IDSIG\s+(\S+)\s+(\S+)/i.exec(identifyContent);
    //    if(!match || !match[1] || !match[2])
    //        throw new Error("Could not find challenge string");
    //
    //    //var selectedPGPKeyID = match[1];
    //    var session_uid = match[2];
    //
    //    var foundRequest = null;
    //    for (var j = 0; j < identifyRequests.length; j++) (function(identifyRequest) {
    //        if (identifyRequest[0].indexOf("IDENTIFY " + session_uid) !== -1) {
    //            foundRequest = identifyRequest;
    //        }
    //    })(identifyRequests[j]);
    //
    //    if(!foundRequest)
    //        throw new Error("Could not find IDENTITY request: " + session_uid);
    //
    //    var sendSocket = foundRequest[1];
    //    Client.sendWithSocket(commandString, sendSocket);
    //    //sendSocket.send(commandString); // TODO: socket out
    //    //console.log("SOCKET OUT (" + sendSocket.url + "): " + commandString);
    //
    //});


    /**
     * @param commandData IDSIG [challenge-string] [session-id] [pgp-key-id] [username] [visibility]
     */
    Client.addResponse(function (commandData, e) {
        var match = /^idsig\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        var split = commandData.split(/\s+/g);
        if(split[0].toUpperCase() !== 'IDSIG')
            throw new Error("Invalid IDSIG: " + commandData);

        var pgp_id_public = split[1];
        var session_uid = split[2];
        var username = split[3];
        var visibility = split[4];

        var status_content =
            "<label><strong>User ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='user'>" + username + "</span><br/></label>" +
            "<label><strong>PGP Key ID:&nbsp;&nbsp;&nbsp;</strong> <span class='pgp-id'>" + pgp_id_public + "</span><br/></label>" +
            "<label><strong>Session ID:&nbsp;&nbsp;&nbsp;</strong> <span class='session-uid'>" + session_uid + "</span><br/></label>" +
            "<label><strong>Visibility:&nbsp;&nbsp;&nbsp;</strong> <span class='visibility'>" + visibility + "</span><br/></label>" +
            "<div class='idsig' style='padding: 1em'>" + commandData + "</div>";

        var ConfigDB = getConfigDB();
        ConfigDB.getConfig(CONFIG_ID, function(err, CONFIG) {
            if(err)
                throw new Error(err);

            for (var j = 0; j < identifyRequests.length; j++) (function(identifyRequest) {
                if (identifyRequest[0].indexOf("IDENTIFY " + session_uid) !== -1) {
                    var socket = identifyRequest[1];
                    var socket_host = socket.url.split('/')[2];

                    var auto_identify_host_attr = '';
                    var auto_identify_all_attr = '';
                    var autoIdentify = false;
                    if(CONFIG) {
                        autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
                        if(CONFIG['autoIdentifyHost:' + socket_host])
                            auto_identify_host_attr = "selected='selected'";
                        else if(CONFIG['autoIdentify'])
                            auto_identify_all_attr = "selected='selected'";
                    }

                    importScripts('pgp/templates/pgp-identify-template.js');
                    Templates.pgp.identify.successForm(commandData, socket.url, CONFIG, function(html) {
                        Client.postResponseToClient("LOG.REPLACE identify: " + html);
                    });
                    // Free up template resources
                    delete Templates.pgp.identify;

                    //var PGPDB = getPGPDB();
                    //PGPDB(function (db) {
                    //    var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
                    //    var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);
                    //
                    //    var index = privateKeyStore.index('id_public');
                    //    var req = index.get(pgp_id_public);
                    //    req.onsuccess = function (evt) {
                    //        var privateKeyData = evt.target.result;
                    //        if(!privateKeyData)
                    //            throw new Error("Could not find private key: " + privateKeyID);
                    //        var pgp_id_private = privateKeyData.id_private + "," + privateKeyData.id_public + "," + username + (privateKeyData.passphrase_required ? ',1' : ',0');
                    //
                    //        Client.postResponseToClient("LOG.REPLACE " + PATH_ID_REQUEST + " * " + IDENTIFY_TEMPLATE_SUCCESS
                    //                .replace(/{\$pgp_id_public}/gi, pgp_id_public)
                    //                .replace(/{\$pgp_id_private}/gi, pgp_id_private)
                    //                .replace(/{\$status_content}/gi, status_content || '')
                    //                .replace(/{\$socket_url}/gi, socket.url || '')
                    //                .replace(/{\$socket_host}/gi, socket.url.split('/')[2] || '')
                    //                .replace(/{\$session_uid}/gi, session_uid || '')
                    //                .replace(/{\$auto_identify_host_attr}/gi, auto_identify_host_attr || '')
                    //                .replace(/{\$auto_identify_all_attr}/gi, auto_identify_all_attr || '')
                    //            //.replace(/{\$[^}]+}/gi, '')
                    //        );
                    //    };
                    //});

//                     console.info("Removing IDENTIFY request: ", identifyRequest);
                    identifyRequests.splice(j, 1);
                    j--;
                }
            })(identifyRequests[j]);


            getPGPDB(function(db) {
               PGPDB.addIDSIGToDatabase(commandData, function(err, sessionData) {
                    if(err)
                        throw new Error(err);

               }) ;
            });
        });
    });


    //
    //
    //
    //function signWithPrivateKey(contentToSign, privateKeyBlock, passphrase, callback) {
    //
    //    var kbpgp = getKBPGP();
    //
    //    kbpgp.KeyManager.import_from_armored_pgp({
    //        armored: privateKeyBlock
    //    }, function(err, alice) {
    //        var params = {
    //            msg:        contentToSign,
    //            sign_with:  alice
    //        };
    //        if (!err) {
    //            if (alice.is_pgp_locked()) {
    //                alice.unlock_pgp({
    //                    passphrase: passphrase
    //                }, function(err) {
    //                    if (!err) {
    //                        console.log("Loaded private key with passphrase");
    //                        kbpgp.box (params, function(err, result_string, result_buffer) {
    //                            callback(err, result_string);
    //                        });
    //
    //                    } else {
    //                        callback(err, null);
    //                    }
    //                });
    //            } else {
    //                console.log("Loaded private key w/o passphrase");
    //                kbpgp.box (params, function(err, result_string, result_buffer) {
    //                    callback(err, result_string);
    //                });
    //            }
    //        } else {
    //            callback(err, null);
    //        }
    //    });
    //
    //}



    function getKBPGP() {
        if(typeof self.kbpgp !== 'undefined')
            return self.kbpgp;
        if(typeof self.crypto === 'undefined') {
            importScripts('pgp/lib/support/nfcrypto.js');
            self.crypto = self.nfCrypto;
            console.log(self.crypto);
        }
        importScripts('pgp/lib/kbpgp/kbpgp.js');
        return self.kbpgp;
    }



    // Database

    function getPGPDB(callback) {
        if(typeof PGPDB !== 'function')
            importScripts('pgp/pgp-db.js');

        if(callback)
            PGPDB(callback);

        return PGPDB;
    }

    function getConfigDB(callback) {
        if(typeof ConfigDB !== 'function')
            importScripts('config/config-db.js');

        if(callback)
            ConfigDB(callback);
        return ConfigDB;
    }

})();

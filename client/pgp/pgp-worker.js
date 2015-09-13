/**
 * Ari 7/2/2015.
 */
(function() {

    importScripts('pgp/pgp-templates.js');

    var CONFIG_ID = 'pgp';

    var PATH_PREFIX = 'pgp:';
    var PATH_MAIN = PATH_PREFIX + 'main';
    var PATH_ID_REQUEST = PATH_PREFIX + 'identify';

    var USE_SOCKET_PGP_KEYGEN = false;


    /**
     * @param commandString
     * @param status_content
     */
    socketCommands.manage = function (commandString, e, status_content) {
        //var match = /^manage$/im.exec(commandString);

        templatePGPManageForm(status_content, function(html) {
            self.routeResponseToClient("LOG.REPLACE pgp-manage: " + html);
        });

        var PGPDB = getPGPDB();
        PGPDB.queryPrivateKeys(function(data) {
            templatePGPManageFormEntry(data, function(html) {
                self.routeResponseToClient("LOG pgp-manage-entries: " + html);
            });
        });

    };

    socketResponses.manage = function(e) {
        throw new Error("manage response is not implemented");
    };

    /**
     * @param commandString KEYGEN --bits [2048] [user id]
     */
    socketCommands.keygen = function (commandString, e) {
        var match = /^keygen ?(.+)?$/im.exec(commandString);
        if(!match)
            throw new Error("Invalid command: " + commandString);

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
            templatePGPKeyGenForm(userID, send_as_socket_command, function(html) {
                self.routeResponseToClient("LOG.REPLACE pgp: " + html);
            });
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

                        templatePGPRegisterForm(privateKeyBlock, '', function(html) {
                            self.routeResponseToClient("LOG.REPLACE pgp: " + html);
                        });

                    });

                    alice.armored_pgp_public = null;
                    alice.export_pgp_public({}, function(err, pgp_public) {
                        console.log("public key: ", pgp_public);


                    });
                });
            }
        });
    };

    socketResponses.keygen = function(responseString, e) {
        throw new Error("keygen response is not implemented");
    };

    /**
     * @param commandString REGISTER
     */
    socketCommands.register = function (commandString, e) {
        var privateKeyBlock = '';
        var status_content = '';
        var match = /^register\s*([\s\S]*)$/im.exec(commandString);
        if(match && match[1])
            privateKeyBlock = match[1].replace(/(\r\n|\r|\n)/g, '\r\n');

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

                    templatePGPRegisterForm(privateKeyBlock, status_content, function(html) {
                        self.routeResponseToClient("LOG.REPLACE pgp: " + html);
                    });
                });

            } else {
                status_content = "<span class='info'>Paste a new PGP PRIVATE KEY BLOCK to register a new PGP Identity manually</span>";
                templatePGPRegisterForm(privateKeyBlock, '', function(html) {
                    self.routeResponseToClient("LOG.REPLACE pgp: " + html);
                });
            }
        } else {

            var PGPDB = getPGPDB();
            PGPDB.addPrivateKeyBlock(privateKeyBlock, function(err, data) {
                console.log(data);
                if(err) {
                    templatePGPRegisterForm(privateKeyBlock, err, function(html) {
                        self.routeResponseToClient("LOG.REPLACE pgp: " + html);
                    });
                } else {
                    socketCommands.manage("MANAGE");

                }
            });
        }

    };

    socketResponses.register = function(responseString, e) {
        throw new Error("register response is not implemented");
    };

    /**
     * @param commandString UNREGISTER [PGP Private Key Fingerprint]
     */
    socketCommands.unregister = function (commandString) {
        var match = /^unregister\s+(.*)$/im.exec(commandString);
        var privateKeyFingerprints = match[1].trim().split(/\W+/g);
        for(var i=0; i<privateKeyFingerprints.length; i++)
            (function(privateKeyFingerprint) {
                var privateKeyID = privateKeyFingerprint.substr(privateKeyFingerprint.length - 16);

                var PGPDB = getPGPDB();
                PGPDB(function (db) {
                    var transaction = db.transaction([PGPDB.DB_TABLE_PRIVATE_KEYS], "readwrite");
                    var privateKeyStore = transaction.objectStore(PGPDB.DB_TABLE_PRIVATE_KEYS);

                    var insertRequest = privateKeyStore.delete(privateKeyID);
                    insertRequest.onsuccess = function(e) {
                        var status_content = "Deleted private key block from database: " + privateKeyID;
                        console.log(status_content);
                        socketCommands.manage("MANAGE", e, status_content);

                    };
                    insertRequest.onerror = function(e) {
                        var err = e.currentTarget.error;
                        var status_content = "Error adding private key (" + privateKeyID + ") database: " + err.message;
                        console.error(status_content, e);
                        socketCommands.manage("MANAGE", e, status_content);

                    };
                });
            }) (privateKeyFingerprints[i]);
    };


    socketResponses.unregister = function(responseString, e) {
        throw new Error("unregister response is not implemented");
    };



    /**
     * @param commandString DEFAULT [PGP Private Key Fingerprint]
     */
    socketCommands['default'] = function (commandString, e) {
        var match = /^default\s+(.*)$/im.exec(commandString);
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
                        socketCommands.manage("MANAGE", e, "Private Key ID set to default: " + privateKeyFingerprint);
                    };
                };
            };
        });
    };

    socketResponses['default'] = function(responseString, e) {
        throw new Error("default response is not implemented");
    };



    var identifyRequests = [];
    /**
     * @param commandData IDENTIFY --session [session-uid]
     */
    socketCommands.identify = function (commandData, e) {
        if(identifyRequests.length === 0)
            throw new Error("No IDENTIFY REQUESTS received");

        var identifyRequest = identifyRequests[0];
        var responseString = identifyRequest[0];
        var socket = identifyRequest[1];

        var ConfigDB = getConfigDB();
        ConfigDB.getConfig(CONFIG_ID, function(err, CONFIG) {
            if(err)
                throw new Error(err);

            templatePGPIdentifyForm(responseString, socket.url, CONFIG, function(html) {
                self.routeResponseToClient("LOG.REPLACE identify: " + html);
            });
        });


        //identifyContent = identifyContent.replace(/--session (\S+)/i, function(match, contents, offset, s) {
        //    session_uid = contents; return '';
        //});
        //identifyContent = identifyContent.replace(/--id (\S+)/i, function(match, contents, offset, s) {
        //    selectedPrivateKeyID = contents; return '';
        //});
        //identifyContent = identifyContent.replace(/--username (\S+)/i, function(match, contents, offset, s) {
        //    username = contents; return '';
        //});
        //identifyContent = identifyContent.replace(/--visibility (\S+)/i, function(match, contents, offset, s) {
        //    visibility = contents; return '';
        //});
        //identifyContent = identifyContent.replace(/(?:-y|--auto-identify) (\S+)/i, function(match, contents, offset, s) {
        //    auto_identify = contents ? true : false; return '';
        //});
    };



    /**
     * @param responseString [challenge_string] [session_id]
     */
    socketResponses.identify = function (responseString, e) {
        var socket = e.target;
        identifyRequests.push([responseString, socket]);
        socketCommands.identify("IDENTIFY", e);

        //ConfigDB.getConfig(CONFIG_ID, function(CONFIG) {
        //    var socket_host = socket.url.split('/')[2];
            //var autoIdentify = CONFIG.autoIdentify || CONFIG['autoIdentifyHost:' + socket_host] || false;
        //});
    };

    /**
     * @param commandData IDSIG [idsig and public key content]
     */
    socketCommands.idsig = function (commandData, e) {
        if(typeof commandData === 'string')
            commandData = {message: commandData, passphrase: null};
        var commandString = commandData.message;

        if(identifyRequests.length === 0)
            throw new Error("No IDENTIFY REQUESTS received");

        var match = /^idsig\s?([\s\S]*)$/im
            .exec(commandString);
        if(!match)
            throw new Error("Could not match idsig content");
        var identifyContent = match[1] || '';

        match = /IDSIG\s+(\S+)\s+(\S+)/i.exec(identifyContent);
        if(!match || !match[1] || !match[2])
            throw new Error("Could not find challenge string");

        //var selectedPGPKeyID = match[1];
        var session_uid = match[2];

        var foundRequest = null;
        for (var j = 0; j < identifyRequests.length; j++) (function(identifyRequest) {
            if (identifyRequest[0].indexOf("IDENTIFY " + session_uid) !== -1) {
                foundRequest = identifyRequest;
            }
        })(identifyRequests[j]);

        if(!foundRequest)
            throw new Error("Could not find IDENTITY request: " + session_uid);

        var sendSocket = foundRequest[1];
        self.sendWithSocket(sendSocket, commandString);
        //sendSocket.send(commandString); // TODO: socket out
        //console.log("SOCKET OUT (" + sendSocket.url + "): " + commandString);

    };


    /**
     * @param commandData IDSIG [challenge-string] [session-id] [pgp-key-id] [username] [visibility]
     */
    socketResponses.idsig = function (commandData, e) {
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

                    templatePGPIdentifySuccessForm(commandData, socket.url, CONFIG, function(html) {
                        self.routeResponseToClient("LOG.REPLACE identify: " + html);
                    });

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
                    //        self.routeResponseToClient("LOG.REPLACE " + PATH_ID_REQUEST + " * " + IDENTIFY_TEMPLATE_SUCCESS
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
    };

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

    var pgpConfig = {};

    function onNewSocket(newSocket) {
        console.log("New Socket", newSocket);
        // type as guest until identify. most functionality won't work without identifying


    }


    function fixChannelPath(path) {
        if(!/#?[~:./a-z_-]+/i.test(path))
            throw new Error("Invalid Path: " + path);
        return path;
    }

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

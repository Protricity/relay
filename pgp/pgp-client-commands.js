/**
 * Ari 7/2/2015.
 */
(function() {
    /**
     * @param commandString
     */
    Client.addCommand(pgpAuthCommand);
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
    Client.addCommand(pgpAuthValidateCommand);
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
    Client.addCommand(manageCommand);
    function manageCommand(commandString, e, status_content) {
        var match = /^manage/i.exec(commandString);
        if(!match)
            return false;

        importScripts('pgp/templates/pgp-manage-template.js');
        Templates.pgp.manage.form(status_content, function(html) {
            Client.postResponseToClient("LOG.REPLACE pgp: " + html);
        });

        // Query private key
        var path = '/.private/id';
        var count = 0;
        getKeySpaceDB().queryContent(path, function(err, contentEntry) {
            if(err)
                throw new Error(err);

            if(contentEntry) {
                count++;
                Templates.pgp.manage.entry(contentEntry, function(html) {
                    Client.postResponseToClient("LOG pgp-manage-entries: " + html);
                });

            } else {
                if(count === 0) {
                    status_content = (status_content ? status_content + "<br/>" : '') + "<strong>No PGP Identities found</strong><br/>" +
                        "<span class='info'>You may <a href='#KEYGEN'>Generate</a>  a new PGP Key Pair Identity</span>";
                    Templates.pgp.manage.form(status_content, function(html) {
                        Client.postResponseToClient("LOG.REPLACE pgp: " + html);
                    });
                }
                // Free up template resources
                //delete Templates.pgp.manage;
            }
        });
        return true;
    }


    /**
     * @param commandString KEYGEN --bits [2048] [user id]
     */
    Client.addCommand(keygenCommand);
    function keygenCommand(commandString, e) {
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

        importScripts('pgp/templates/pgp-generate-template.js');
        Templates.pgp.generate.form(userID, function(html) {
            Client.postResponseToClient("LOG.REPLACE pgp: " + html);
        });
        // Free up template resources
        delete Templates.pgp.generate;

        return true;
    }

    /**
     * @param commandString REGISTER
     */
    Client.addCommand(registerCommand);
    function registerCommand(commandString, e) {
        var match = /^register\s*([\s\S]*)$/im.exec(commandString);
        if(!match)
            return false;

        var privateKeyBlock = (match[1] || '').replace(/(\r\n|\r|\n)/g, '\r\n');
        var status_content = "Paste a new PGP PRIVATE KEY BLOCK to register a new PGP Identity manually";
        importScripts('pgp/templates/pgp-register-template.js');
        Templates.pgp.register.form(privateKeyBlock, status_content, function(html) {
            Client.postResponseToClient("LOG.REPLACE pgp: " + html);
        });
        // Free up template resources
        delete Templates.pgp.register;
        return true;
    }


    /**
     * @param commandString UNREGISTER [PGP Private Key Fingerprint]
     */
    Client.addCommand(unregisterCommand);
    function unregisterCommand(commandString, e) {
        var match = /^unregister\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        var publicKeyIDs = match[1].trim().split(/\W+/g);
        for(var i=0; i<publicKeyIDs.length; i++) {
            (function (publicKeyID) {
                publicKeyID = publicKeyID.substr(publicKeyID.length - 16);

                // Query private key(s)
                var privateKeyPath = 'http://' + publicKeyID + '.ks/.private/id';
                getKeySpaceDB().queryContent(privateKeyPath, function(err, privateKeyData) {
                    if(err)
                        throw new Error(err);
                    if(privateKeyData) {
                        getKeySpaceDB().deleteContent(privateKeyData.pgp_id_public, privateKeyData.timestamp, function(err) {
                            if(err)
                                throw new Error(err);
                            console.info("PGP Identity deleted successfully: " + privateKeyData.user_id);
                            manageCommand("MANAGE", e, "<span class='success'>PGP Identity deleted successfully</span>: " + privateKeyData.user_id + "<br/>Public Key ID: " + publicKeyID);
                        });
                    }
                });
            })(publicKeyIDs[i]);
        }
        return true;
    }

    /**
     * @param commandString DEFAULT [PGP Private Key Fingerprint]
     */
    Client.addCommand(commandDefault);
    function commandDefault(commandString, e) {
        var match = /^default\s+(.*)$/im.exec(commandString);
        if(!match)
            return false;

        var publicKeyID = match[1].trim().split(/\W+/g)[0];
        publicKeyID = publicKeyID.substr(publicKeyID.length - 16);
        console.log("TODO: default", publicKeyID);
    }

    function getKeySpaceDB() {
        if(typeof self.KeySpaceDB === 'undefined') {
            if(typeof importScripts === "function")
                importScripts('ks/ks-db.js');
            else
                self.KeySpaceDB = require('./ks-db.js').KeySpaceDB;
        }
        return self.KeySpaceDB;
    }
})();


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
    //        importScripts('pgp/templates/pgp-identify-template.js');
    //        Templates.pgp.identify.form(responseString, socket.url, CONFIG, function(html) {
    //            Client.postResponseToClient("LOG.REPLACE identify: " + html);
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
//                    importScripts('pgp/templates/pgp-identify-template.js');
//                    Templates.pgp.identify.successForm(commandData, socket.url, CONFIG, function(html) {
//                        Client.postResponseToClient("LOG.REPLACE identify: " + html);
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
//                    //        Client.postResponseToClient("LOG.REPLACE " + PATH_ID_REQUEST + " * " + IDENTIFY_TEMPLATE_SUCCESS
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


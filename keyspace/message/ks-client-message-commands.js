/**
 * KeySpace Auth Commands
 * 
 * Provides command and response handling for KEYSPACE.AUTH
 */
 
if(typeof module === 'object') (function() {
    
    /**
     * Initiates Client Command/Response Handlers for the worker thread
     **/
    module.exports.initClientKSMessageCommands = function (ClientWorkerThread) {
        
        // Add Command/Response Handlers     
        ClientWorkerThread.addCommand(ksMessageCommand);
        ClientWorkerThread.addResponse(ksMessageResponse);


        /**
         * Handles Command: KEYSPACE.MESSAGE [To: PGP ID] [From: PGP ID] [message]
         * @param {string} commandString The command string to process 
         * @param {object} e The command Event
         * @return {boolean} true if handled otherwise false
         **/
        function ksMessageCommand(commandString, e) {
            var match = /^(?:keyspace\.)?message(?:\.(encrypt))?\s+([a-f0-9]{8,})\s*([a-f0-9]{8,})?\s*([\s\S]*)$/im.exec(commandString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            var subCommand = (match[1] || '').toLowerCase();
            var pgp_id_to = match[2].toUpperCase();
            var pgp_id_from = (match[3] || '').toUpperCase();
            var contentString = match[4];

            if(!pgp_id_from) {
                var authKeySpaces = getClientSubscriptions().getAuthorizedKeySpaces();
                if(authKeySpaces.length === 0)
                    throw new Error("You must be online to send private messages");
                pgp_id_from = authKeySpaces[0]; // TODO: what to do if multiple?
            }

            // TODO: only check if we are keeping track of authorization statuses of other keyspaces
            //if(!getClientSubscriptions().isKeySpaceAuthorized(pgp_id_from))
            //    throw new Error("Keyspace must be online to send private messages: " + pgp_id_from);

            renderMessageWindow(pgp_id_to, pgp_id_from, false);

            if(contentString) {
                if(subCommand === 'encrypt') {
                    self.module = {exports: self.exports = {}};
                    importScripts('pgp/lib/openpgpjs/openpgp.js');
                    var openpgp = self.module.exports;

                    self.module = {exports: {}};
                    importScripts('keyspace/ks-db.js');
                    var KeySpaceDB = self.module.exports.KeySpaceDB;

                    var requestURL = 'http://' + pgp_id_to + '.ks/public/id';
                    KeySpaceDB.queryOne(requestURL, function(err, contentEntry) {
                        if(err || !contentEntry)
                            throw new Error("Public Key not found for: " + pgp_id_from);

                        var publicKey = openpgp.key.readArmored(contentEntry.content).keys[0];

                        openpgp.encryptMessage(publicKey, contentString)
                            .then(function(encryptedContentString) {
                                var formattedCommandString = "KEYSPACE.MESSAGE" +
                                    " " + pgp_id_to +
                                    " " + pgp_id_from +
                                    " " + encryptedContentString;
                                ClientWorkerThread.sendWithSocket(formattedCommandString);

                                getMessageExports().renderMessage(formattedCommandString, false, function (html) {
                                    ClientWorkerThread.render(html);
                                });

                                //ServerSubscriptions.notifyAllAuthenticatedKeySpaceClients(pgp_id_public, "EVENT KEYSPACE.HOST.CHALLENGE " + encryptedMessage);

                            }).catch(function(error) {
                                throw new Error(error);
                            });
                    });

                } else {
                    var formattedCommandString = "KEYSPACE.MESSAGE" +
                        " " + pgp_id_to +
                        " " + pgp_id_from +
                        " " + contentString;
                    ClientWorkerThread.sendWithSocket(formattedCommandString);

                    getMessageExports().renderMessage(formattedCommandString, false, function (html) {
                        ClientWorkerThread.render(html);
                    });
                }
            }
            return true;
        }


        /**
         * Handles Response: KEYSPACE.MESSAGE [To: PGP ID] [From: PGP ID] [message]
         * @param {string} responseString The response string to process 
         * @param {object} e event The response Event
         * @return {boolean} true if handled otherwise false
         **/
        function ksMessageResponse(responseString, e) {
            var match = /^(?:keyspace\.)?message\s+([a-f0-9]{8,})\s+([a-f0-9]{8,})\s*([\s\S]*)$/im.exec(responseString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            var pgp_id_to = match[1].toUpperCase();
            var pgp_id_from = match[2].toUpperCase();
            var messageContent = match[3];

            renderMessageWindow(pgp_id_to, pgp_id_from, true, function() {
                messageContent = parsePGPEncryptedMessageHTML(pgp_id_to, pgp_id_from, messageContent);
                if(messageContent === '!')
                    messageContent = parseActionMessage(pgp_id_to, pgp_id_from, messageContent);

                responseString = "KEYSPACE.MESSAGE " + pgp_id_to + " " + pgp_id_from + " " + messageContent;

                getMessageExports().renderMessage(responseString, true, function (html) {
                    ClientWorkerThread.render(html);
                });
            });

            return true;
        }

        var activeMessages = [];
        function renderMessageWindow(pgp_id_to, pgp_id_from, switchOnResponse, callback) {
            var uid = pgp_id_to + ':' + pgp_id_from;
            if(switchOnResponse)
                uid = pgp_id_from + ':' + pgp_id_to;

            if (activeMessages.indexOf(uid) === -1) {
                getMessageExports().renderMessageWindow(pgp_id_to, pgp_id_from, switchOnResponse,
                    function (html) {
                        ClientWorkerThread.render(html);
                        activeMessages.push(uid);
                        if(callback)
                            callback();
                    }
                );

                // Check for missing public keys
                requestPublicKeyContent(pgp_id_to);
                requestPublicKeyContent(pgp_id_from);

            } else {
                ClientWorkerThread.postResponseToClient("FOCUS ks-message:" + uid)
                if(callback)
                    callback();
            }
        }

        function requestPublicKeyContent(pgp_id_public, callback) {

            // Check for missing public keys
            var requestURL = 'http://' + pgp_id_public + '.ks/public/id';
            KeySpaceDB.queryOne(requestURL, function(err, contentEntry) {
                if (contentEntry) {
                    if(callback)
                        callback(contentEntry);
                    //console.log("Sender Private Key Found: ", contentEntry);

                } else {
                    var requestCommand = 'GET http://' + pgp_id_public + '.ks/public/id';
                    console.log("Requesting Public Key: " + pgp_id_public, requestCommand);
                    ClientWorkerThread.sendWithSocket(requestCommand);

                    if(callback)
                        throw new Error("Incomplete");
                    // TODO: track request ID and trigger callback
                }
            });

        }

        function parseActionMessage(pgp_id_to, pgp_id_from, contentString) {
            var match = /^!(\w+)\s*([\s\S]*)$/.exec(contentString);
            if(!match) {
                console.error("Invalid Action Message: " + contentString);
                return contentString;
            }

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            // TODO: ask user for auto-authorization for action commands
            var action = match[1].toLowerCase();
            switch(action) {
                case 'get':
                    var requestPath = match[2];
                    if(requestPath.toLowerCase().indexOf('.priv') >= 0)
                        throw new Error("TODO: protect private folders");

                    var requestURL = 'http://' + pgp_id_to + '.ks/' + requestPath;
                    KeySpaceDB.queryOne(requestURL, function (err, contentData) {
                        var commandString = null;
                        if (err) {
                            console.error("GET Request Failed: " + requestURL, err);
                            commandString = "KEYSPACE.MESSAGE " + pgp_id_from + " " + pgp_id_to + " " +
                                "!http 400 " + err;

                        } else {
                            console.info("GET Request: " + requestURL);
                            commandString = "KEYSPACE.MESSAGE " + pgp_id_from + " " + pgp_id_to + " " +
                                "!http 200 OK" +
                                "\n\n" +
                                contentData.content;
                        }

                        ClientWorkerThread.sendWithSocket(commandString);
                    });
                    contentString = '<span class="action">' + contentString + '</span>';
                    break;

                case 'http':
                    var responseSplit = match[2].split(/\n\n/);
                    var responseHeader = responseSplit[0];
                    var responseBody = responseSplit[1];

                    self.module = {exports: self.exports = {}};
                    importScripts('pgp/lib/openpgpjs/openpgp.js');
                    var openpgp = self.module.exports;

                    KeySpaceDB.verifyAndAddContent(openpgp, responseBody, pgp_id_from,
                        function(err, insertedContent) {
                            if(!insertedContent)
                                err = "No Content Inserted";
                            var commandString = "KEYSPACE.MESSAGE " + pgp_id_from + " " + pgp_id_to + " ";
                            if(err) {
                                commandString += "!http.error " + err;

                            } else {
                                commandString += "!http.success " + insertedContent.timestamp;
                            }

                        }
                    );

                    break;

                case 'http.success':
                    console.info("Action: " + action);
                    contentString = '<span class="action">' + contentString + '</span>';
                    return contentString;

                default:
                case 'http.error':
                    console.info("Action Error: " + action);
                    contentString = '<span class="action error">' + contentString + '</span>';
                    return contentString;
            }
            return contentString;
        }


        function parsePGPEncryptedMessageHTML(pgp_id_to, pgp_id_from, contentString, spos) {
            spos = contentString.indexOf("-----BEGIN PGP MESSAGE-----", spos);
            if(spos === -1)
                return contentString;
            var fpos = contentString.indexOf("-----END PGP MESSAGE-----", spos);
            if(fpos === -1)
                throw new Error("Missing END PGP MESSAGE");
            fpos += "-----END PGP MESSAGE-----".length;

            var pgpEncryptedMessageString = contentString.substr(spos, fpos);

            var uid = generateUID('xxxx').toUpperCase();


//             console.log("TODO Processing Encrypted PGP Message: ", uid);


            self.module = {exports: {}};
            importScripts('keyspace/passphrase/ks-client-passphrases.js');
            var ClientPassPhrases = self.module.exports.ClientPassPhrases;

            self.module = {exports: self.exports = {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            var pgpEncryptedMessage = openpgp.message.readArmored(pgpEncryptedMessageString);
            var pgp_id_public = pgpEncryptedMessage.getEncryptionKeyIds()[0].toHex().toUpperCase();

            var classUID = 'pgp-message:' + uid;
            var replaceHTML =
                "<span class='" + classUID + " pgp-message: unprocessed'>" +
                "<i>[Decrypting PGP Message with <span class='pgp-id-public'>" + pgp_id_public + "</span>...]</i>" +
                "<div class='encrypted-content'>" + pgpEncryptedMessageString + "</div>" +
                "</span>";

            setTimeout(function() {
                var passphrase = null;
                ClientPassPhrases.requestDecryptedPrivateKey(pgp_id_public, passphrase,
                    function(err, privateKey, passphrase) {

                        // TODO: Why is this hack needed?
                        var encryptionKeyIds = pgpEncryptedMessage.getEncryptionKeyIds();
                        var privateKeyPacket = privateKey.getKeyPacket(encryptionKeyIds);
                        if(passphrase)
                            privateKeyPacket.decrypt(passphrase);
                        if(!privateKeyPacket.isDecrypted)
                            throw new Error("Subkey not decrypted");

                        openpgp.decryptMessage(privateKey, pgpEncryptedMessage)
                            .then(function (decryptedMessageString) {

                                if(contentString[0] === '!')
                                    decryptedMessageString = parseActionMessage(pgp_id_to, pgp_id_from, decryptedMessageString);

                                var replaceHTML =
                                    "<span class='" + classUID + " pgp-message: decrypted'>" +
                                    "<span class='decrypted-content'>" + decryptedMessageString + "</span>" +
                                    //"<i>[Encrypted with <span class='pgp-id-public'>" + pgp_id_public + "</span>]</i>" +
                                    "</span>";

                                ClientWorkerThread.render(replaceHTML);
                            }).catch(function(err) {

                                console.error(err);
                            });
                    }
                );
            }, 300);

            return contentString.substr(0, spos)
                + replaceHTML
                + contentString.substr(fpos);
        }

        function getClientSubscriptions() {
            if(typeof getClientSubscriptions.inst === 'undefined') {
                self.module = {exports: {}};
                importScripts('client/subscriptions/client-subscriptions.js');
                getClientSubscriptions.inst = self.module.exports.ClientSubscriptions;
            }
            return getClientSubscriptions.inst;
        }

        var messageExports = null;
        function getMessageExports() {
            if(messageExports)
                return messageExports;
            self.module = {exports: {}};
            importScripts('keyspace/message/render/ks-message-window.js');
            return messageExports = self.module.exports;
        }

        function generateUID(format) {
            return (format).replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }
    };
})();

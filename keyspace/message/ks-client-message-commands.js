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
        function ksMessageCommand(commandString) {
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

            if(!getClientSubscriptions().isKeySpaceAuthorized(pgp_id_from))
                throw new Error("Keyspace must be online to send private messages: " + pgp_id_from);

            renderMessageWindow(pgp_id_to, pgp_id_from);

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
        function ksMessageResponse(responseString) {
            var match = /^(?:keyspace\.)?message\s+([a-f0-9]{8,})\s+([a-f0-9]{8,})\s*([\s\S]*)$/im.exec(responseString);
            if (!match)         // If unmatched, 
                return false;   // Pass control to next handler

            var pgp_id_to = match[1].toUpperCase();
            var pgp_id_from = match[2].toUpperCase();
            var content = match[3];

            responseString = parsePGPEncryptedMessageHTML(responseString);

            renderMessageWindow(pgp_id_to, pgp_id_from);
            getMessageExports().renderMessage(responseString, function (html) {
                ClientWorkerThread.render(html);
            });
            return true;
        }

        var activeMessages = [];
        function renderMessageWindow(pgp_id_to, pgp_id_from) {
            var id = pgp_id_to + ':' + pgp_id_from;
            if (activeMessages.indexOf(id) === -1) {
                getMessageExports().renderMessageWindow(pgp_id_to, pgp_id_from, function (html) {
                    ClientWorkerThread.render(html);
                    activeMessages.push(id);
                });
            } else {
                ClientWorkerThread.postResponseToClient("FOCUS ks-message:" + id)
            }
        }


        function parsePGPEncryptedMessageHTML(contentString, spos) {
            spos = contentString.indexOf("-----BEGIN PGP MESSAGE-----", spos);
            if(spos === -1)
                return contentString;
            var fpos = contentString.indexOf("-----END PGP MESSAGE-----", spos);
            if(fpos === -1)
                throw new Error("Missing END PGP MESSAGE");
            fpos += "-----END PGP MESSAGE-----".length;

            var pgpEncryptedMessage = contentString.substr(spos, fpos);

            var uid = generateUID('xxxx').toUpperCase();

            var replaceHTML =
                "<span class='pgp-message: pgp-message:" + uid + " unprocessed'>" +
                    "<i>[Decrypting PGP Message...]</i>" +
                    "<div class='encrypted-content'>" + pgpEncryptedMessage + "</div>" +
                "</span>";

            console.log("TODO Processing Encrypted PGP Message: ", uid);

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

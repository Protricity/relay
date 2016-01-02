/**
 * Created by ari.
 */

if(typeof module === 'object') (function() {
    module.exports.initClientKSMessageCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(ksMessageCommand);
        ClientWorkerThread.addResponse(ksMessageResponse);


        function ksMessageCommand(commandString) {
            var match = /^(?:keyspace\.)?message\s+([a-f0-9]{8,})\s*([a-f0-9]{8,})?\s*([\s\S]*)$/im.exec(commandString);
            if (!match)
                return false;

            var pgp_id_to = match[1].toUpperCase();
            var pgp_id_from = (match[2] || '').toUpperCase();
            var content = match[3];

            if(!pgp_id_from) {
                var authKeySpaces = getClientSubscriptions().getAuthorizedKeySpaces();
                if(authKeySpaces.length === 0)
                    throw new Error("You must be online to send private messages");
                pgp_id_from = authKeySpaces[0]; // TODO: what to do if multiple?
            }

            if(!getClientSubscriptions().isKeySpaceAuthorized(pgp_id_from))
                throw new Error("Keyspace must be online to send private messages: " + pgp_id_from);

            renderMessageWindow(pgp_id_to, pgp_id_from);

            if(content) {
                var formattedCommandString = "KEYSPACE.MESSAGE" +
                    " " + pgp_id_to +
                    " " + pgp_id_from +
                    " " + content;
                ClientWorkerThread.sendWithSocket(formattedCommandString);
            }
            return true;
        }

        function ksMessageResponse(responseString) {
            var match = /^(?:keyspace\.)?message\s+([a-f0-9]{8,})\s+([a-f0-9]{8,})\s*([\s\S]*)$/im.exec(responseString);
            if (!match)
                return false;

            var pgp_id_to = match[1].toUpperCase();
            var pgp_id_from = match[2].toUpperCase();
            var content = match[3];

            //var username = match[2];
            //var content = fixPGPMessage(match[3]);
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

    };
})();
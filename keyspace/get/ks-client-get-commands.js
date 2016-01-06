/**
 * Created by ari.
 */

if(typeof module === 'object') (function() {
    module.exports.initClientKSGetCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(getCommand);
        ClientWorkerThread.addResponse(getResponse);
        ClientWorkerThread.addResponse(httpResponse); // Not an Alias for GET response. Handles requests sent by the client

        /**
         * Processes a request from the client and makes a request to the server if necessary
         * @param {string} commandString GET [url] [\n headers]
         * @param {object} e
         */
        function getCommand(commandString, e) {
            var match = /^(head|get)\s+/i.exec(commandString);
            if (!match)
                return false;

            var socket = e.target;
            if(!socket)
                throw new Error("Invalid Socket target");

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            KeySpaceDB.executeLocalGETRequest(commandString,
                function(responseBody, responseCode, responseMessage, responseHeaders) {
    
                    var responseString = 'HTTP/1.1 ' + (responseCode || 200) + ' ' + (responseMessage || 'OK') +
                        (responseHeaders ? "\n" + responseHeaders : '') +
                        (responseBody ? "\n\n" + responseBody : '');

                    self.module = {exports: {}};
                    importScripts('keyspace/get/browser/render/ks-browser.js');
                    var renderBrowser = self.module.exports.renderBrowser;

                    renderBrowser(responseString, function (html) {
                        ClientWorkerThread.render(html);
                    });

                    // Content was missing, so ask make a request to the server
                    if(responseCode !== 200) {
                        ClientWorkerThread.log(
                            "<span class='direction'>O</span>: " +
                            "<span class='request'><a href='" + commandString + "'>" + commandString + "</a></span>: "
                        );

                        if(typeof ClientSockets === 'undefined')
                            importScripts('client/sockets/client-sockets.js');

                        KeySpaceDB.executeSocketGETRequest(commandString, ClientSockets, // TODO: hack?
                          function(responseBody, responseCode, responseMessage, responseHeaders, responseSocket) {
                              var responseString = 'HTTP/1.1 ' + (responseCode || 200) + ' ' + (responseMessage || 'OK') +
                                  (responseHeaders ? "\n" + responseHeaders : '') +
                                  (responseBody ? "\n\n" + responseBody : '');

                              renderBrowser(responseString, function (html) {
                                  ClientWorkerThread.render(html);
                              });
                          }
                      );
                    }
                    
                }
            );

            return true;
        }

        /**
         * Gets a request from a socket and sends a response
         * @param {string} responseString 
         * @param {object} e 
         **/
        function getResponse(responseString, e) {
            var match = /^(head|get)/i.exec(responseString); 
            if (!match)
                return false;

            ClientWorkerThread.log(
                "<span class='direction'>I</span>: " +
                "<span class='request'><a href='" + responseString + "'>" + responseString + "</a></span>: "
            );

            var socket = e.target;
            if(!socket)
                throw new Error("Invalid Socket target");

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            KeySpaceDB.executeLocalGETRequest(responseString,
                function(responseBody, responseCode, responseMessage, responseHeaders) {
                    var responseString = 'HTTP/1.1 ' + (responseCode || 200) + ' ' + (responseMessage || 'OK') +
                        (responseHeaders ? "\n" + responseHeaders : '') +
                        (responseBody ? "\n\n" + responseBody : '');
                    
                    ClientWorkerThread.sendWithSocket(responseString, socket);
                }
            );
            return true;
        }

        /**
         * Gets a (previously requested) HTTP response from a socket and processes it
         * @param {string} responseString 
         * @param {object} e 
         **/
        function httpResponse(responseString, e) {
            var match = /^http\/1.1 (\d+)\s+([\w ]*)/i.exec(responseString);
            if (!match)
                return false;

            ClientWorkerThread.log(
                "<span class='direction'>I</span>: " +
                "<span class='request'><a href='" + responseString + "'>" + responseString + "</a></span>: "
            );

            self.module = {exports: {}};
            importScripts('keyspace/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            var ret = KeySpaceDB.handleHTTPResponse(responseString, e ? e.target : null);
            if(ret === true)
                return true;

            console.warn("Unhandled: ", responseString);
            return false;
            //renderResponseString(responseString);
        }

    };
})();
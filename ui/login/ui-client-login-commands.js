/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientUILoginCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(uiLoginCommand);

        function uiLoginCommand(commandString, e) {
            var match = /^(?:ui\.)?login(?:\.(\S+))?/i.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var subCommand = match[1];

            if(subCommand) {
                switch(subCommand.toLowerCase()) {
                    case 'create':
                        //ClientWorkerThread.execute("CLOSE ui-login:");
                        ClientWorkerThread.execute("OPEN ui-login:");
                        ClientWorkerThread.execute("PGP.KEYGEN");
                        break;

                    case 'import':
                        //ClientWorkerThread.execute("CLOSE ui-login:");
                        ClientWorkerThread.execute("OPEN ui-login:");
                        ClientWorkerThread.execute("PGP.IMPORT");
                        break;

                    case 'guest':
                        break;
                        
                    case 'remote':
                        throw new Error("remote login unavailable yet");

                    case 'keyspaces':
                        ClientWorkerThread.execute("KEYSPACE.SEARCH");
                        ClientWorkerThread.execute("CLOSE ui-login:");
                        break;

                    case 'channels':
                        ClientWorkerThread.execute("CHANNEL.SEARCH");
                        ClientWorkerThread.execute("CLOSE ui-login:");
                        break;

                    case 'message':
                        ClientWorkerThread.execute("UI.CONTACTS");
                        ClientWorkerThread.execute("CLOSE ui-login:");
                        break;

                }
                
            }

            self.module = {exports: {}};
            importScripts('ui/login/render/ui-login.js');
            var templateExports = self.module.exports;

            var forceRender = false;
            templateExports.renderUILoginWindow(subCommand, forceRender, function (html) {
                Client.render(html);
            });
            // Command was handled
            return true;
        }
    };
})();
/**
 * Ari 7/2/2015.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientUILoginCommands = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(uiLoginCommand);

        function uiLoginCommand(commandString, e) {
            var match = /^(?:ui\.)?login(?:\.(\w+))?/i.exec(commandString);
            if (!match)         // If unmatched,
                return false;   // Pass control to next handler

            var subCommand = match[1];

            if(subCommand) {
                console.log(subCommand);
                ClientWorkerThread.execute("CLOSE ui-login:");

            } else {

                self.module = {exports: {}};
                importScripts('render/ui/login/render/ui-login.js');
                var templateExports = self.module.exports;

                var forceRender = false;

                templateExports.renderUILoginWindow(forceRender, function (html) {
                    Client.render(html);
                });
            }

            // Command was handled
            return true;
        }
    };
})();
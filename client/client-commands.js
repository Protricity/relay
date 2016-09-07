(function() {

    // Log Commands
    self.addEventListener('command:log', onLogCommand);
    self.addEventListener('command:info', onLogCommand);
    self.addEventListener('command:error', onLogCommand);
    self.addEventListener('command:assert', onLogCommand);
    self.addEventListener('command:warn', onLogCommand);
    function onLogCommand(e) {
        var match = /^(log|info|error|assert|warn)\s*([\s\S]*)$/i.exec(e.detail.commandString);
        if(!match)
            throw new Error("Invalid Command Type");

        e.preventDefault(); // Prevent other command handlers from executing this command

        var commandType = match[1].toLowerCase();
        var value = match[2];
        console[commandType](value);
    }

    // Server Commands
    self.addEventListener('response:server', onServerResponse);
    function onServerResponse(e) {
        var match = /^server\s+(\w+)\s+(\w+)/i.exec(e.detail.responseString);
        if(!match)
            throw new Error("Invalid Server Response");

        e.preventDefault(); // Prevent other command handlers from executing this command

        e.target.VERSION = match[1];
        e.target.VERSION_STRING = match[2];
        console.info("Socket Server Version: " + e.target.VERSION_STRING, e.target); // , e.target);
        // ClientSockets.refreshSocketsWindow();

    }

    // Render Commands
    self.addEventListener('command:render', onRenderProxyCommand);
    function onRenderProxyCommand(e) {
        var args = /^render\s*([\s\S]*)$/mi.exec(e.detail.commandString);
        if (!args)
            throw new Error("Invalid Command");

        e.preventDefault(); // Prevent other command handlers from executing this command

        var htmlContent = args[1];
        var renderEvent = new CustomEvent('render:tags', {
            detail: htmlContent
        });
        self.dispatchEvent(renderEvent);

        // Post response to client port
        var port = e.detail.source;
        port.postMessage("RENDER " + htmlContent); // TODO: object or string?
    }


    /** PROXY COMMANDS **/


    // HTTP Commands
    self.addEventListener('command:http', onHTTPProxy);
    self.addEventListener('response:http', onHTTPProxy);
    function onHTTPProxy(e) {
        self.removeEventListener('command:http', onHTTPProxy);
        self.removeEventListener('response:http', onHTTPProxy);
        importScripts('keyspace/client-keyspace-commands.js');
    }

    // PGP Commands
    self.addEventListener('command:pgp', onPGPProxyCommand);
    function onPGPProxyCommand(e) {
        self.removeEventListener('command:pgp', onPGPProxyCommand);
        importScripts('pgp/client-pgp-commands.js');
    }

    // Chat/Channel Commands
    self.addEventListener('command:channel', onChannelProxy);
    self.addEventListener('response:channel', onChannelProxy);
    function onChannelProxy(e) {
        self.removeEventListener('command:channel', onChannelProxy);
        self.removeEventListener('response:channel', onChannelProxy);
        importScripts('channel/client-channel-commands.js');
    }

    // Beta Subscribe Commands
    self.addEventListener('command:beta', onBetaProxy);
    self.addEventListener('response:beta', onBetaProxy);
    function onBetaProxy(e) {
        self.removeEventListener('command:beta', onBetaProxy);
        self.removeEventListener('response:beta', onBetaProxy);
        importScripts('beta/client-beta-commands.js');
    }

    // App Commands
    self.addEventListener('command:app', onAppProxy);
    self.addEventListener('response:app', onAppProxy);
    function onAppProxy(e) {
        self.removeEventListener('command:app', onAppProxy);
        self.removeEventListener('response:app', onAppProxy);
        importScripts('app/client-app-commands.js');
    }
})();

/**
 * Created by ari on 6/19/2015.
 */

(function() {
    // Handle missing event listener in CLI mode
    var events = this;
    if(typeof events == 'undefined' || typeof events.addEventListener == 'undefined')
        events = require('./cli/cli-events.js').CLIEventListener;

    // Log Commands
    events.addEventListener('command:log', onLogCommand);
    events.addEventListener('command:info', onLogCommand);
    events.addEventListener('command:error', onLogCommand);
    events.addEventListener('command:assert', onLogCommand);
    events.addEventListener('command:warn', onLogCommand);
    function onLogCommand(e) {
        var Command = e.detail;
        var match = /^(log|info|error|assert|warn)\s*([\s\S]*)$/i.exec(Command);
        if(!match)
            throw new Error("Invalid Command Type");

        e.preventDefault(); // Prevent other command handlers from executing this command

        var commandType = match[1].toLowerCase();
        var value = match[2];
        console[commandType](value);
    }

    // Server Commands
    events.addEventListener('command:server', onServerResponse);
    function onServerResponse(e) {
        var Command = e.detail;
        var match = /^server\s+(\w+)\s+(\w+)/i.exec(Command);
        if(!match)
            throw new Error("Invalid Server Response");

        e.preventDefault(); // Prevent other command handlers from executing this command

        e.target.VERSION = match[1];
        e.target.VERSION_STRING = match[2];
        console.info("Socket Server Version: " + e.target.VERSION_STRING, e.target); // , e.target);
        // ClientSockets.refreshSocketsWindow();

    }

    // Render Commands
    events.addEventListener('command:render', onRenderProxyCommand);
    function onRenderProxyCommand(e) {
        var Command = e.detail;
        var args = /^render\s*([\s\S]*)$/mi.exec(Command);
        if (!args)
            throw new Error("Invalid Command");

        e.preventDefault(); // Prevent other command handlers from executing this command

        var htmlContent = args[1];
        var renderEvent = new CustomEvent('render:tags', {
            detail: htmlContent
        });
        events.dispatchEvent(renderEvent);

        // Post response to client port
        var port = Command.getSource();

        port.postMessage("RENDER2 " + htmlContent); // TODO: object or string?
    }


    /** PROXY COMMANDS **/


    // HTTP Commands
    events.addEventListener('command:http', onHTTPProxy);
    function onHTTPProxy(e) {
        events.removeEventListener('command:http', onHTTPProxy);
        importScripts('keyspace/client-keyspace-commands.js');
    }

    // PGP Commands
    events.addEventListener('command:pgp', onPGPProxyCommand);
    function onPGPProxyCommand(e) {
        events.removeEventListener('command:pgp', onPGPProxyCommand);
        importScripts('pgp/client-pgp-commands.js');
    }

    // Chat/Channel Commands
    events.addEventListener('command:channel', onChannelProxy);
    function onChannelProxy(e) {
        events.removeEventListener('command:channel', onChannelProxy);
        importScripts('channel/client-channel-commands.js');
    }

    // Beta Subscribe Commands
    events.addEventListener('command:beta', onBetaProxy);
    function onBetaProxy(e) {
        events.removeEventListener('command:beta', onBetaProxy);
        importScripts('beta/client-beta-commands.js');
    }

    // App Commands
    events.addEventListener('command:app', onAppProxy);
    function onAppProxy(e) {
        events.removeEventListener('command:app', onAppProxy);
        importScripts('app/client-app-commands.js');
    }
})();

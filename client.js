/**
 * Created by ari on 6/19/2015.
 */

if(typeof importScripts !== 'undefined') {
    // If we're in a worker thread, set up the worker
    importScripts('client/worker/worker-thread.js');

    // Set up worker command listeners
    importScripts('client/client-commands.js')


} else if(typeof require !== 'undefined') {
    // If we're in a worker thread, set up the worker
    require('./client/cli/client-cli.js');

    // Set up worker command listeners
    require('./client/client-commands.js')


} else if(typeof document !== 'undefined') {
    // If we're in the document scope, included as a script
    document.addEventListener("DOMContentLoaded", function() {
        var worker, port;
        //document.FORCE_WEB_WORKER = true;

        // Set up SharedWorker or WebWorker
        if(typeof SharedWorker == 'function' && !document.FORCE_WEB_WORKER) {
            // Create Shared WebWorker
            worker = new SharedWorker('client.js');
            port = worker.port;
            port.start();

        } else if (typeof Worker == 'function') {
            // Create Normal WebWorker
            worker = new Worker('client.js');
            port = worker;

        } else {
            throw new Error("WebWorker unavailable");
        }

        // Set up message handling
        port.addEventListener('message', function (e) {
            var responseString = e.data || e.detail || e;
            console.log("Response: ", responseString);
            var responseEvent = new CustomEvent('response', {
                detail: responseString
            });
            document.dispatchEvent(responseEvent);
        }, true);

        // Set up execution handling
        document.addEventListener('command', function(e) {
            var commandString = e.data || e.detail || e;
            console.log("Command: ", commandString);
            port.postMessage(commandString);
            e.preventDefault();
        });

        // Send ready message to worker
        port.postMessage("INFO READY");
        //console.log("initialized Worker", worker);
    }, false);


} else {

    throw new Error("Invalid Environment");
}

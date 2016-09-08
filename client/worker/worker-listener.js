/**
 * Created by ari on 6/19/2015.
 */

if(typeof document === 'undefined')
    throw new Error("Invalid Environment");
// If we're in the document scope, included as a script

(function() {
    var worker, port;
    //document.FORCE_WEB_WORKER = true;

    // Set up SharedWorker or WebWorker
    if(typeof SharedWorker == 'function' && !document.FORCE_WEB_WORKER) {
        // Create Shared WebWorker
        worker = new SharedWorker('relay.js');
        port = worker.port;
        port.start();

    } else if (typeof Worker == 'function') {
        // Create Normal WebWorker
        worker = new Worker('relay.js');
        port = worker;

    } else {
        throw new Error("WebWorker unavailable");
    }

    // Set up message handling
    port.addEventListener('message', function (e) {
        var commandString = e.data;
        if(!commandString) 
            throw new Error("Ignoring empty message");
        var Command = new WorkerResponse(commandString, port);
        console.log("Response: ", commandString);
        // command vs message
        var responseEvent = new CustomEvent('command:' + Command.getType(), {
            detail: Command,
            cancelable: true
        });
        document.dispatchEvent(responseEvent);
        if(responseEvent.defaultPrevented)
            return;

        console.error("Unhandled worker response (type=" + type + "): " + commandString);
    }, true);

    // Set up execution handling
    document.addEventListener('command', function(e) {
        var commandString = e.detail;
        var Command = new DOMCommand(commandString, port);
        console.log("Command: ", commandString);
        var responseEvent = new CustomEvent('command:' + Command.getType(), {
            detail: Command,
            cancelable: true
        });
        document.dispatchEvent(responseEvent);
        if(responseEvent.defaultPrevented)
            return;
        e.preventDefault();

        console.error("Unhandled worker response (type=" + type + "): " + commandString);
    });

    // Send ready message to worker
    // port.postMessage("INFO READY");

    function WorkerResponse(commandString, source) {
        var type = commandString.split(/[^\w]+/)[0].toLowerCase();
        this.toString = function() { return commandString; };
        this.getSource = function() { return source; };
        this.getType = function() { return type; };
    }

    function DOMCommand(commandString, source) {
        var type = commandString.split(/[^\w]+/)[0].toLowerCase();
        this.toString = function() { return commandString; };
        this.getSource = function() { return source; };
        this.getType = function() { return type; };
    }

})();

//console.log("initialized Worker", worker);


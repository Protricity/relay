/**
 * Created by ari on 6/19/2015.
 */

if(typeof importScripts === 'undefined')
    throw new Error("Invalid Environment");


(function() {

    // If we're in a worker thread
    if(self.SharedWorkerGlobalScope && self instanceof SharedWorkerGlobalScope) {
        // Listen for connecting ports
        self.addEventListener('connect', onConnect);
        console.log("Initiated SharedWorker thread", self);

    } else if (self.DedicatedWorkerGlobalScope && self instanceof DedicatedWorkerGlobalScope) {
        // Listen for main thread messages
        self.addEventListener('message', onMessageCommand);
        console.log("Initiated WebWorker thread", self);
    }


    function onMessageCommand(e) {
        var commandString = e.data;
        if(!commandString)
            throw new Error("Ignoring empty message");
        var Command = new WorkerCommand(commandString, this);

        var type = Command.getType();

        var messageEvent = new CustomEvent('command:'+type, {
            detail: Command,
            cancelable: true
        });
        self.dispatchEvent(messageEvent);
        if(messageEvent.defaultPrevented)
            return;

        messageEvent = new CustomEvent('command', {
            detail: Command,
            cancelable: true
        });
        self.dispatchEvent(messageEvent);
        if(messageEvent.defaultPrevented)
            return;

        console.error("Unhandled command (type=" + type + "): " + commandString);
    }

    // For Shared Workers

    var portCount=0;
    function onConnect(e) {
        var port = e.ports[0];
        port.i = ++portCount;
        port.addEventListener('message', onMessageCommand);
        port.addEventListener('close', onPortClose);

        // Required when using addEventListener. Otherwise called implicitly by onmessage setter.
        port.start();
        port.postMessage("INFO New SharedWorker port connected #" + port.i);
        console.log("New SharedWorker port connected #", port.i, port);
    }

    function onPortClose(e) {
        var messageEvent = new CustomEvent('close', {
            detail: e.detail,
            cancelable: true
        });
        self.dispatchEvent(messageEvent);
        console.log("Does this ever happen?");
    }

    function WorkerCommand(commandString, source) {
        var type = commandString.split(/[^\w]+/)[0].toLowerCase();
        this.toString = function() { return commandString; };
        this.getSource = function() { return source; };
        this.getType = function() { return type; };
    }

})();
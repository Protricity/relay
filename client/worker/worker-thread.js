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
        var commandDetail = typeof e.data == 'string' ? {commandString: e.data} : e.data;
        if(!commandDetail.commandString)
            throw new Error("Invalid Command String");
        console.log("Command: ", commandDetail);

        commandDetail.type = commandDetail.commandString.split(/[^\w]+/)[0].toLowerCase();
        commandDetail.source = this;
        commandDetail.event = e;

        var messageEvent = new CustomEvent('command:'+commandDetail.type, {
            detail: commandDetail,
            cancelable: true
        });
        self.dispatchEvent(messageEvent);
        if(messageEvent.defaultPrevented)
            return;

        messageEvent = new CustomEvent('command', {
            detail: commandDetail,
            cancelable: true
        });
        self.dispatchEvent(messageEvent);
        if(messageEvent.defaultPrevented)
            return;

        console.error("Unhandled command (type=" + commandDetail.type + "): " + commandDetail.commandString);
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
            detail: e.data || e.detail,
            source: this,
            event: e,
            cancelable: true
        });
        self.dispatchEvent(messageEvent);
        console.log("Does this ever happen?");
    }

})();
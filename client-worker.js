/**
 * Created by ari on 6/19/2015.
 */

if(typeof document !== 'undefined') {

    if(typeof self.Client === 'undefined')
        self.Client = {};
        
    if(true && typeof SharedWorker == 'function') {

        
        var sharedSocketWorker = new SharedWorker('client-worker.js');

        sharedSocketWorker.port.addEventListener('message', function(e) {
            var responseString = e.data || e.detail || e;
            Client.processResponse(responseString);
        }, true);
        sharedSocketWorker.port.start();

        Client.execute = function (commandString) {
            sharedSocketWorker.port.postMessage(commandString);
        };

        console.log("Started Client SharedWorker", sharedSocketWorker);
    } else if (typeof Worker == 'function') {
        var socketWorker = new Worker('client-worker.js');

        socketWorker.addEventListener('message', function(e) {
            var responseString = e.data || e.detail || e;
            Client.processResponse(responseString);
        }, true);

        Client.execute = function (commandString) {
            socketWorker.postMessage(commandString);
        };

        console.log("Started Client WebWorker", socketWorker);

    } else {
        throw new Error("Worker unavailable");
    }

} else if(typeof importScripts !== 'undefined') {
    importScripts('client/worker/client-worker-thread.js');
    console.log("Initiated WebWorker thread");

} else {
    throw new Error("Invalid Environment");
}

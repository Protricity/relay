/**
 * Created by ari on 6/19/2015.
 */

if(typeof document !== 'undefined') {

    var socketWorker = new Worker('client-worker.js');

    socketWorker.addEventListener('message', function(e) {
        var responseString = e.data || e.detail || e;
        Client.processResponse(responseString);
    }, true);

    if(typeof Client === 'undefined') {
        function Client() {

        }
    }

    Client.execute = Client.execute || function (commandString) {
        socketWorker.postMessage(commandString);
    };

    Client.processResponse = Client.processResponse || function (responseString) {
        throw new Error("Client must define Client.processResponse = function(responseString)...")
    };


} else if(typeof importScripts !== 'undefined') {
    importScripts('client/worker/client-worker-thread.js');

} else {
    throw new Error("Invalid Environment");
}

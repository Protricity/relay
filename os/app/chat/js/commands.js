/**
 * Created by ari on 6/19/2015.
 */


var chatWorker = new Worker('js/worker.js');

chatWorker.onmessage = function(e) {
    var args = e.data.split(/\s+/);
    switch(args[0].toLowerCase()) {
        case 'join':
            break;

        default:
            throw new Error("Unknown Command: " + args[0]);
    }
};

function joinChannel(path) {
    chatWorker.postMessage('join ' +  path);
}

joinChannel('/country/israel/politics/default.ch');

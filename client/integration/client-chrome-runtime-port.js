/**
 * Created by ari on 6/19/2015.
 */

//if(typeof document === 'undefined')
//    throw new Error("Invalid Environment");

if(typeof self.Client === 'undefined')
    self.Client = {};

if(!chrome || !chrome.runtime)
    throw new Error("Missing: chrome.runtime");

(function() {

    var extensionID = chrome.runtime.id;
    socketWorker = chrome.runtime.connect(extensionID, {name: name}); // 'relay-render-proxy'
    socketWorker.onMessage.addListener(function (responseString) {
        Client.processResponse(responseString);
    });
    console.info("Connecting to Chrome Runtime Extension: " + extensionID, socketWorker);

    Client.execute = function(commandString) {
        var args = /^\w+/.exec(commandString);
        if (!args)
            throw new Error("Invalid Command: " + commandString);

        socketWorker.postMessage(commandString);
    };

})();
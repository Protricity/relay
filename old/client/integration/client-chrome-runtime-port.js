/**
 * Created by ari on 6/19/2015.
 */

if(!chrome || !chrome.runtime)
    throw new Error("Missing: chrome.runtime");

(function() {

    var Client = typeof self.Client !== 'undefined' ? self.Client : self.Client = function(){};

    var extensionID = chrome.runtime.id;
    webWorker = chrome.runtime.connect(extensionID, {name: name}); // 'relay-render-proxy'
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
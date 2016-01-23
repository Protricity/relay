/**
 * Created by ari on 6/19/2015.
 */


if(typeof document === 'undefined')
    throw new Error("Invalid Environment");

if(!chrome || !chrome.runtime)
    throw new Error("Missing: chrome.runtime");

if(!Client || !Client.execute)
    throw new Error("Missing: Client.execute");

(function() {

    var activeClientPorts = [];
    function addListener(port) {
        if(port.name !== name)
            throw new Error("Unrecognized Port Name: " + port.name);

        activeClientPorts.push(port);
        console.log("New Port Client: " + name, port);
        port.onMessage.addListener(
            function (message) {
                console.log("Executing Proxy Message: ", message, port);
                Client.execute(message, port);
            }
        );
    }

    chrome.runtime.onConnect.addListener(addListener);
    console.log("Port Listener loaded: " + name);

    Client.processResponse = function(responseString) {
        var args = /^\w+/.exec(responseString);
        if (!args)
            throw new Error("Invalid Command: " + responseString);

        // Handle port hosting
        for (i = 0; i < activeClientPorts.length; i++) {
            var port = activeClientPorts[i];
            try {
                port.postMessage(responseString);

            } catch (e) {
                activeClientPorts.splice(i--, 1);
                console.info("Removed disconnected Port");
            }
        }

    };
})();

//Client.tryConnectToPortListener = function(name) {
//    if(socketWorker)
//        throw new Error("Socket Worker already initiated");
//
//    if(!chrome.runtime.connect)
//        return false;
//
//    var extensionID = chrome.runtime.id;
//    console.info("Attempting connection to ", extensionID, name)
//    socketWorker = chrome.runtime.connect(extensionID, {name: name}); // 'relay-render-proxy'
//    socketWorker.onMessage.addListener(function(responseString) {
//        Client.processResponse(responseString);
//    });
//    console.info("Found chrome runtime", socketWorker);
//    return true;
//};
//
//var activeClientPorts = [];
//Client.addPortListener = function(name) { // 'relay-render-proxy'
//    function addListener(port) {
//        if(port.name !== name)
//            throw new Error("Unrecognized Port Name: " + port.name);
//
//        activeClientPorts.push(port);
//        console.log("New Port Client: " + name, port);
//        port.onMessage.addListener(
//            function (message) {
//                console.log("Executing Proxy Message: ", message, port);
//                Client.execute(message, port);
//            }
//        );
//    }
//    chrome.runtime.onConnect.addListener(addListener);
//    console.log("Port Listener loaded: " + name);
//};

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
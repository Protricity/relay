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

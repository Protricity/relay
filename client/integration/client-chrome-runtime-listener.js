/**
 * Created by ari on 6/19/2015.
 */

if(!chrome || !chrome.runtime)
    throw new Error("Missing: chrome.runtime");

(function() {

    var Client = typeof self.Client !== 'undefined' ? self.Client : self.Client = function(){};

    var activeClientPorts = [];
    function addListener(port) {
        //if(port.name !== name)
        //    throw new Error("Unrecognized Port Name: " + port.name);

        activeClientPorts.push(port);
        console.log("New Port Client: " + port.name, port);
        port.onMessage.addListener(
            function (message) {
                console.log("Executing Proxy Message: ", message, port);
                Client.execute(message, port);
            }
        );
    }

    chrome.runtime.onConnect.addListener(addListener);
    console.log("Port Listener loaded");

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

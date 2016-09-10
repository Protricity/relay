/**
 * Created by ari on 6/19/2015.
 */

if(typeof document === 'undefined')
    throw new Error("Invalid Environment");
// If we're in the document scope, included as a script

(function() {

    // Handle Worker message render events
    document.addEventListener('message:render', onRenderMessage);
    
    // Set up command execution handling
    document.addEventListener('command:render', onRenderCommand);
    
    
    function onRenderMessage(e) {
        var commandString = e.detail;
        console.log("TODO: Handle DOM Render: ", commandString);
        //port.postMessage(commandString);
        e.preventDefault();
    }

    function onRenderCommand(e) {
        var commandString = e.detail;
        console.log("Worker Command: ", commandString);
        e.preventDefault();
        port.postMessage(commandString);
    }

    // Send ready message to worker
    // port.postMessage("INFO READY");
})();

//console.log("initialized Worker", worker);


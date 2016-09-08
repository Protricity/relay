/**
 * Created by ari on 6/19/2015.
 */

if(typeof document === 'undefined')
    throw new Error("Invalid Environment");
// If we're in the document scope, included as a script

(function() {

    // Set up execution handling
    document.addEventListener('command:render', function(e) {
        var commandString = e.detail;
        console.log("Handle DOM Render: ", commandString);
        //port.postMessage(commandString);
        e.preventDefault();
    });

    // Send ready message to worker
    // port.postMessage("INFO READY");
})();

//console.log("initialized Worker", worker);


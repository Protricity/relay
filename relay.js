/**
 * Created by ari on 6/19/2015.
 */

if(typeof importScripts !== 'undefined') {
    // If we're in a worker thread, set up the worker
    importScripts('client/worker/worker-thread.js');

    // Set up worker command listeners
    importScripts('client/commands.js')


} else if(typeof require !== 'undefined') {
    // If we're in a cli environment, set up CLI

    // Set up worker command listeners
    require('./client/commands.js');

    var events = require('./client/cli/cli-events.js').CLIEventListener;
    var CLIPrompt = require('./client/cli/cli-prompt.js').CLIPrompt;
    CLIPrompt.start();



} else if(typeof document !== 'undefined') {
    // If we're in the document scope, included as a script

    // Set up WebWorker or SharedWorker
    var script = document.createElement('script');
    script.src = 'client/worker/worker-listener.js';
    document.head.appendChild(script);

    // Set up DOM Renderer
    script = document.createElement('script');
    script.src = 'client/render/dom-render.js';
    document.head.appendChild(script);


} else {

    throw new Error("Invalid Environment");
}

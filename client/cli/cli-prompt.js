if (typeof self !== 'undefined')
    throw new Error("self already defined");


if (!module) var module = {exports: {}};
module.exports.CLIPrompt = new CLIPrompt();


function CLIPrompt() {

}

CLIPrompt.prototype.start = function() {
    process.stdout.write("$ ");
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    var util = require('util');

    process.stdin.on('data', function (text) {
        // util.inspect()
        process.stdout.write(text.trim());
        process.stdout.write("\n$ ");
        if (text === 'quit\n') {
            done();
        }
    });

    function done() {
        console.log('Now that process.stdin is paused, there is nothing more to do.');
        process.exit();
    }
};
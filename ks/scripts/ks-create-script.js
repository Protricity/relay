/**
 * Created by ari on 10/8/2015.
 */


if(!exports) var exports = {};
(function() {

    // Argument Steps. One step per argument
    var argStep = [
        "<input type='text' name='title' placeholder='Add a title' />",
        "<input type='text' name='tags' placeholder='Add tags' />"
    ];

    var ARG_STEP_TEMPLATE = "\
        <article class='channel put-script:'>\n\
            <script src='ks/listeners/ks-put-script-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <header class='title-bar'>\n\
                <strong>Create An Article</strong><span>:</span>\
                <a class='title-bar-minimize' href='#MINIMIZE put-script:'>[-]</a><!--\n\
             --><a class='title-bar-maximize' href='#MAXIMIZE put-script:'>[+]</a><!--\n\
             --><a class='title-bar-close' href='#CLOSE put-script:'>[x]</a>\n\
            </header>\
            <form action='#' name='ks-put-script-form' onsubmit='ClientSocketWorker.sendCommand(\"{$command_string}\"); return false;'>\n\
                {$html_input}\
                <button type='submit' name='submit'>Next</button>\n\
                <input type='hidden' name='command_string' value='{$command_string}' />\n\
            </form>\n\
        </article>";

    // Exports

    exports.runScript = function(commandString, callback) {
        var match = /^put\.template\s*([\s\S]*)$/im.exec(commandString);
        if(!match)
            return false;

        var args = match[2] ? match[2].split(/\s+/) : [];

        var url = match[1];
        match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(url);
        if(!match)
            throw new Error("Invalid URI: " + url);

        var scheme = match[2],
            host = match[4],
            contentPath = match[5].toLowerCase() || '';

        if(argStep.length <= args.length)
            throw new Error("Missing Step: " + argStep.length);

        var stepCall = argStep[args.length];
        var stepCallHTML = stepCall;
        if(typeof stepCallHTML === 'string')
            stepCall = function(commandString, callback) { callback(stepCallHTML); };

        stepCall(commandString, function(html_input) {


            callback(ARG_STEP_TEMPLATE
                .replace(/{\$html_input}/i, html_input)
                .replace(/{\$command_string}/ig, commandString)
            );
        });

        return true;
    };


})();
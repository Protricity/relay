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

    // Exports

    exports.runScript = function(commandString, callback) {
        var match = /^put\.template\s*(\S*)\s*([\s\S]*)$/im.exec(commandString);
        if(!match)
            return false;
        console.log(commandString);
        var args = match[2] ? match[2].split(/\s+/) : [];

        

        if(argStep.length <= args.length)
            throw new Error("Missing Step: " + argStep.length);

        var stepCall = argStep[args.length];
        var stepCallHTML = stepCall;
        if(typeof stepCallHTML === 'string')
            stepCall = function(commandString, callback) { callback(stepCallHTML); };

        console.log(stepCall);
        stepCall(commandString, function(html_input) {

            var ARG_STEP_TEMPLATE = "\
                <section class='put-template-content:'>\n\
                    <form action='#' name='ks-create-script-form' onsubmit='ClientSocketWorker.sendCommand(\"{$command_string} \" + this.title.value); return false;'>\n\
                        <label class='label-title hide-on-compact'>\n\
                            {$html_input}\
                        </label>\n\
                    </form>\n\
                </section>";

            callback(ARG_STEP_TEMPLATE
                .replace(/{\$html_input}/i, html_input)
                .replace(/{\$command_string}/ig, commandString)
            );
        });

        return true;
    };


})();
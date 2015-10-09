/**
 * Created by ari on 10/8/2015.
 */


if(!exports) var exports = {};
(function() {

    // Argument Steps. One step per argument
    var argStep = [
        addTitle
    ];

    function addTitle(commandString, callback) {
        var ARG_STEP_TEMPLATE = "\
        <section class='put-template-content:'>\n\
            <form name='ks-create-script-form'>\n\
                {$command_string}\n\
            </form>\n\
        </section>";

        callback(ARG_STEP_TEMPLATE
            .replace(/{\$command_string}/i, commandString)
        );
    }

    // Exports

    exports.runScript = function(commandString, callback) {
        var match = /^put\.template\s*(\S*)\s*([\s\S]*)$/im.exec(commandString);
        if(!match)
            return false;

        var args = match[2] ? match[2].split(/\s+/) : [];
        argStep[args.length](commandString, callback);

        return true;
    };


})();
/**
 * Created by ari on 9/5/2015.
 */

var getUserIndexTemplate = function(commandString, callback) {
    var TEMPLATE_USER_INDEX = "\
        <h2>User Index</h2>\n\
        {rest::index {$url}}\n\
    ";

    var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid GET Request: " + commandString);
    var contentURL = match[1];

    callback(TEMPLATE_USER_INDEX
            .replace('{$url}', contentURL)
    );
};

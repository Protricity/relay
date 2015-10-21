/**
 * Created by ari on 9/5/2015.
 */

var getRootIndexTemplate = function(commandString, callback) {
    var TEMPLATE_INDEX = "\
        <h2>Index</h2>\n\
        {ks::index {$url}}\n\
    ";

    var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid GET Request: " + commandString);
    var contentURL = match[1];

    callback(TEMPLATE_INDEX
        .replace('{$url}', contentURL)
    );
};

/**
 * Created by ari on 9/5/2015.
 */

var get404IndexTemplate = function(commandString, callback) {
    var TEMPLATE_404 = "\
        <h2>404 Not Found</h2>\n\
        <p>Try these pages instead:</p>\n\
        {ks::index {$url}}\n\
    ";

    var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid GET Request: " + commandString);
    var contentURL = match[1];

    callback(TEMPLATE_404
        .replace('{$url}', contentURL),
        '404',
        'Not Found'
    );
};

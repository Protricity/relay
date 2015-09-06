/**
 * Created by ari on 9/5/2015.
 */

var get404IndexTemplate = function(commandString, callback) {
    var TEMPLATE_404 =
        "<h2>404 Not Found</h2>" +
        "<p>Try these pages instead:</p>" +
        "{$html_ul_index}";
    callback(TEMPLATE_404 , '404', 'Not Found');
};
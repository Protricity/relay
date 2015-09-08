/**
 * Created by ari on 9/5/2015.
 */

var getRootIndexTemplate = function(commandString, callback) {
    var TEMPLATE_INDEX =
        "<h2>Index</h2>" +
        "{$html_ul_index}";
    callback(TEMPLATE_INDEX);
};
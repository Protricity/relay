/**
 * Created by ari on 9/5/2015.
 */
var getUserIndexTemplate = function(commandString, callback) {
    var TEMPLATE_HOME_INDEX =
        "<h2>User Index</h2>" +
        "{$html_ul_index}";
    callback(TEMPLATE_HOME_INDEX);
};

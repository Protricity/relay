/**
 * Created by ari on 9/5/2015.
 */
var getHomeIndexTemplate = function(commandString, callback) {
    var TEMPLATE_HOME_INDEX =
        "<h2>Home Index</h2>" +
        "{$html_ul_index}";
    callback(TEMPLATE_HOME_INDEX);
};

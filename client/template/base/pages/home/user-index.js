/**
 * Created by ari on 9/5/2015.
 */
var getUserIndexTemplate = function(commandString, callback) {
    var TEMPLATE_HOME_INDEX =
        "<h2>User Index</h2>" +
        "{$html_ul_index}";


    var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/im.exec(commandString);
    if(!match)
        throw new Error("Invalid GET Request: " + commandString);
    var contentURL = match[1];
    RestDB.listURLIndex(contentURL, function(urls) {
        var pathHTML = "<ul class='path-index'>";

        for(var i=0; i<urls.length; i++)
            pathHTML += "\t<li><a href='" + urls[i][0] + "'>" + urls[i][1] + "</a></li>";
        pathHTML += "</ul>";
        callback(TEMPLATE_HOME_INDEX
            .replace(/{\$html_ul_index}/gi, pathHTML)
        );
    });
};

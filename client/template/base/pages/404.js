/**
 * Created by ari on 9/5/2015.
 */

var get404IndexTemplate = function(commandString, callback) {
    var TEMPLATE_404 =
        "<h2>404 Not Found</h2>" +
        "<p>Try these pages instead:</p>" +
        "{$html_ul_index}";


    var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/mi.exec(commandString);
    if(!match)
        throw new Error("Invalid GET Request: " + commandString);
    var contentURL = match[1];
    RestDB.listURLIndex(contentURL, function(urls) {
//         console.log(contentURL, urls);
        var pathHTML = "<ul class='path-index'>";

        for(var i=0; i<urls.length; i++)
            pathHTML += "\t<li><a href='" + urls[i][0] + "'>" + urls[i][1] + "</a></li>";
        pathHTML += "</ul>";
        TEMPLATE_404 = TEMPLATE_404.replace(/{\$html_ul_index}/gi, pathHTML);
        callback(TEMPLATE_404 , '404', 'Not Found');
    });
};
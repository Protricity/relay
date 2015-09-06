
var responsePages = [
    [/^\/?home\//i, function(commandString, callback) { importScripts('template/base/pages/home/index.js'); callback(TEMPLATE_HOME_INDEX); }],
    [/^\//, function(commandString, callback) { importScripts('template/base/pages/index.js'); callback(TEMPLATE_INDEX);}]
];

var getDefaultResponse = function(commandString, callback) {
    var headers = commandString.split(/\n/);
    var firstLine = headers.shift();
    var match = /^get\s*(.*)$/i.exec(firstLine);
    if(!match)
        throw new Error("Invalid GET Request: " + contentURL);
    var contentURL = match[1];

    match = contentURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
    var contentURLHost = match[4];
    var contentURLPath = (match[5] || '')
        .replace(/^\/~/, '/home/' + contentURLHost)
        .toLowerCase();

    for(var i=0; i<responsePages.length; i++) {
        console.log(responsePages[i], contentURLPath, contentURL);
        if(responsePages[i][0].test(contentURLPath)) {
            responsePages[i][1](commandString, callback);
            return;
        }
    }

    importScripts('template/base/pages/404.js');
    callback(TEMPLATE_404, '404', 'Not Found');
};
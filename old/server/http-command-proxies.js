/**
 * Created by ari on 9/22/2015.
 */
if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.initHTTPServerCommands = function(HTTPServer) {

    // Load all command proxies for HTTP Server Requests

    // File Handling
    require('./http/http-file-commands.js')
        .initHTTPFileCommands(HTTPServer);

    // KeySpace Requests
    require('../keyspace/ks-server-commands.js')
        .initHTTPKeySpaceCommands(HTTPServer);

    // Beta Requests
    //require('../beta/beta-server-commands.js')
    //    .initBetaHTTPCommands(HTTPServer);
    //console.log("Loaded beta/beta-server-commands.js");
};

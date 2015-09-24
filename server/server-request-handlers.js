/**
 * Created by ari on 9/19/2015.
 */


HTTPServer.addRequestHandler(/^GET @pgp/i, function(requestString, responseCallback) {
    require('../pgp/pgp-request-handlers.js').processSocketRequest(requestString, responseCallback);
});
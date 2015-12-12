/**
 * Created by ari on 9/21/2015.
 */

//http://www.chovy.com/web-development/self-signed-certs-with-secure-websockets-in-node-js/
var defaults = require('./config.js');

require('./server/http/http-server.js')
    .HTTPServer.startServer(defaults.HTTP_SERVER_DEFAULT_PORT);
require('./server/socket/socket-server.js')
    .SocketServer.startServer(defaults.SOCKET_SERVER_DEFAULT_PORT);

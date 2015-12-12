/**
 * Created by ari on 9/21/2015.
 */

//http://www.chovy.com/web-development/self-signed-certs-with-secure-websockets-in-node-js/
require('./server/http/http-server.js')
    .HTTPServer.startServer('7315, 80');

require('./server/socket/socket-server.js')
    .SocketServer.startServer(7314);

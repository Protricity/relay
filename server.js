/**
 * Created by ari on 9/21/2015.
 */


require('./server/http/http-server.js').HTTPServer.startServer(7315);
require('./server/socket/socket-server.js').SocketServer.startServer(7314);

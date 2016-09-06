/**
 * Created by ari on 9/21/2015.
 */

console.log("Setting up Relay server dependencies...");

var exec = require('child_process').exec;
if(!exec)
	throw new Error('Could not fork child process ;(');

exec('npm config set registry http://registry.npmjs.org/');
exec('npm install --save ws');
exec('npm install --save openpgp');
exec('npm install mongodb');


console.log("Testing dependencies...");
var defaults = require('./config.js');
var HTTPServer = require('./server/http/http-server.js').HTTPServer;
var SocketServer = require('./server/socket/socket-server.js').SocketServer;

console.log("Starting Server...");
HTTPServer.startServer(defaults.HTTP_SERVER_DEFAULT_PORT);
SocketServer.startServer(defaults.SOCKET_SERVER_DEFAULT_PORT);

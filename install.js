/**
 * Created by ari on 7/7/2016.
 */


console.log("Setting up Relay Server Dependencies...");

var exec = require('child_process').execSync;


exec('npm config set registry http://registry.npmjs.org/');
exec('npm install --save ws');
exec('npm install --save openpgp');
exec('npm install mongodb');
// exec('npm install indexeddb-js sqlite3');
// exec('npm install http-server -g');

console.log("Testing require..");

require('./server/http/http-server.js');
require('./server/socket/socket-server.js');

console.log("Finished. Try $ node server.js' to test server");

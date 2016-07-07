/**
 * Created by ari on 7/7/2016.
 */

var exec = require('child_process').execSync;


exec('npm config set registry http://registry.npmjs.org/');
exec('npm install --save ws');
exec('npm install --save openpgp');
exec('npm install mongodb');
// exec('npm install indexeddb-js sqlite3');
// exec('npm install http-server -g');

 /*
 #!/bin/sh

npm install --save ws;
npm install --save openpgp;
npm install mongodb;
#npm install indexeddb-js sqlite3
#npm install http-server -g;
*/
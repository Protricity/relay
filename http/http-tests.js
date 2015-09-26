/**
 * Created by ari on 9/25/2015.
 */

if(!exports) var exports = {};
exports.test = function() {
    require('./http-server-commands.js').test();
    require('./http-client-commands.js').test();
    //require('http-listeners').test();
    require('./http-db.js').test();
    console.log('Test Complete: ' + __filename);
};
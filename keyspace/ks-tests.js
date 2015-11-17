/**
 * Created by ari on 9/25/2015.
 */

if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.test = function() {
    require('./ks-server-commands.js').test();
    require('./ks-client-commands.js').test();
    //require('http-listeners').test();
    require('./ks-db.js').test();
    console.log('Test Complete: ' + __filename);
};
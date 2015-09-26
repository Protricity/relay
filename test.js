/**
 * Created by ari on 9/25/2015.
 */

if(!exports) var exports = {};
exports.test = function() {
    require('./http/http-tests.js').test();
};
exports.test();
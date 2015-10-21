/**
 * Created by ari on 9/25/2015.
 */

if (!module) var module = {};
if (!module.exports) module.exports = {};
module.exports.test = function() {
    require('./ks/ks-tests.js').test();
};
module.exports.test();

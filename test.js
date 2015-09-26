/**
 * Created by ari on 9/25/2015.
 */

if(!exports) var exports = {};
exports.test = function() {
    var tests = [
        require('./http/http-tests.js').test
    ];

    for(var i=0; i<tests.length; i++)
        setTimeout(tests[i], 1);
};
exports.test();
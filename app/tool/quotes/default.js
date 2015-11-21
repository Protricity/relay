/**
 * Created by ari on 11/16/2015.
 *
 * This script provides a set of historic quotes to be used throughout the Relay client
 */

// http://mentalfloss.com/article/53181/inspiring-quotes-10-influential-women-tech

if(typeof module === 'object') (function() {
    module.exports.getDefaultPredicateList = function (callback) {
        callback([
            // Predicates
            ["Unleash Democracy"],

            // Quotes
            ["Consistency is the hobgoblin of narrow minds"]
        ])
    };
})();
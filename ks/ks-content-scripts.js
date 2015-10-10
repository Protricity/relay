/**
 * Created by ari on 10/8/2015.
 */

if(!exports) var exports = {};

exports.getContentScripts = function() {
    return [
        ['ks/scripts/ks-create-script.js', 'Create new Key Space Content'],
        ['app/social/vote/scripts/create-vote-script.js', 'Create a new Public Vote']

    ];
};
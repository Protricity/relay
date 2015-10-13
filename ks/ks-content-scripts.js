/**
 * Created by ari on 10/8/2015.
 */

if(!exports) var exports = {};

exports.getContentScripts = function() {
    return [
        ['ks/render/scripts/create-form/ks-script-create-form.js', 'Simple Content Wizard'],
        ['app/social/vote/scripts/create-vote-script.js', 'Create a new Public Vote']

    ];
};
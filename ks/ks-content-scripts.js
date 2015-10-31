/**
 * Created by ari on 10/8/2015.
 */

if (!module) var module = {};
if (!module.exports) module.exports = {};

module.exports.getContentScripts = function() {
    return [
        ['ks/scripts/create/ks-script-create-form.js', 'Simple Content Wizard'],
        ['app/social/vote/vote.js', 'Create a new Public Vote']

    ];
};
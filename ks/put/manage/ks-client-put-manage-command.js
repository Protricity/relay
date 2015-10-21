/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutManageCommand = function(Client) {
    Client.addCommand(putManageCommand);

    function putManageCommand(commandString, status_content) {
        var match = /^put.manage\s*(\S+)?$/im.exec(commandString);
        if (!match)
            return false;

        var contentURL = match[1] || '/';

        self.module = {exports: {}};
        importScripts('ks/put/manage/render/ks-put-manage-form.js');
        self.module.exports.renderPutManageForm(contentURL, status_content, function (html) {
            Client.render(html);
        });

        return true;
    }

};

/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initClientKSPutManageCommand = function (ClientWorkerThread) {
        ClientWorkerThread.addCommand(putManageCommand);

        function putManageCommand(commandString) {
            var match = /^put.manage\s*(\S+)?$/im.exec(commandString);
            if (!match)
                return false;

            var contentURL = match[1] || '/';

            self.module = {exports: {}};
            importScripts('keyspace/put/manage/render/ks-put-manage-form.js');
            self.module.exports.renderPutManageForm(contentURL, '', function (html) {
                ClientWorkerThread.render(html);
            });

            return true;
        }

    };
})();
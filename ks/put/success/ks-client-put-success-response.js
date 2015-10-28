/**
 * Created by ari.
 */
if(typeof module === 'object') {
    module.exports.initClientKSPutSuccessResponse = function (Client) {
        Client.addResponse(putSuccessResponse);

        /**
         * @param responseString PUT.SUCCESS [PGP ID] [timestamp]
         * @returns {boolean}
         */
        function putSuccessResponse(responseString) {
//         console.log(responseString);
            var match = /^put\.success\s+([a-f0-9]{8,16})\s+(\d+)$/im.exec(responseString);
            if (!match)
                return false;

            var pgp_id_public = match[1];
            var timestamp = match[2];


            self.module = {exports: {}};
            importScripts('ks/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            KeySpaceDB.getContent(pgp_id_public, timestamp, function (err, entryData) {
                if (err)
                    throw new Error(err);

                if (!entryData)
                    throw new Error("Entry missing: " + pgp_id_public + ' ' + timestamp);

                entryData.published = 1;
                KeySpaceDB.update(KeySpaceDB.DB_TABLE_HTTP_CONTENT, null, entryData,
                    function (err, updateData) {
                        console.info("Publish Successful:", pgp_id_public, timestamp);

                        var requestURL = "http://" + entryData.pgp_id_public + ".ks/" + entryData.path;

                        var status_box = "<strong>Key Space</strong> content <span class='command'>published</span> " +
                            "<span class='success'>Successfully</span>: " +
                            "<br/><a href='" + requestURL + "'>" + entryData.path + "</a>";

                        self.module = {exports: {}};
                        importScripts('ks/put/manage/render/ks-put-manage-form.js');
                        self.module.exports.renderPutManageForm(requestURL, status_box, function (html) {
                            Client.render(html);
                        });

                    });

            });

            return true;
        }
    };
}
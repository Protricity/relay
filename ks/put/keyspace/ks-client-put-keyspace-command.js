/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutKeySpaceCommand = function(Client) {
    Client.addCommand(putCommand);
    console.info("Loaded: " + self.location);


    // TODO: review command
    function putCommand(commandString) {
        var match = /^put\s+(\w+)\s+([\s\S]+)$/im.exec(commandString);
        if (!match)
            return false;

        var pgp_id_public = match[1] || null;

        var content = (match[2] || '').trim();

        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        // Only encrypted messages will be accepted
        self.module = {exports: {}};
        importScripts('pgp/lib/openpgpjs/openpgp.js');
        var openpgp = self.module.exports;
        var pgpMessage = openpgp.cleartext.readArmored(content);
        var pgpSignedContent = pgpMessage.armor().trim();
        var verifiedContent = pgpSignedContent;

        var path = /data-path=["'](\S+)["']/i.exec(verifiedContent.text)[1];
        var timestamp = parseInt(/data-timestamp=["'](\d+)["']/i.exec(verifiedContent.text)[1]);


        KeySpaceDB.verifyAndAddContentToDB(
            pgpSignedContent,
            pgp_id_public,
            timestamp,
            path,
            function (err, insertData) {
                if (err)
                    throw new Error(err);

                var url = "http://" + insertData.pgp_id_public + '.ks/' + insertData.path;

                var status_box = "<strong>Key Space</strong> content stored <span class='success'>Successful</span>: " +
                    "<br/><a href='" + url + "'>" + insertData.path + "</a>";

                self.module = {exports: {}};
                importScripts('ks/put/manage/render/ks-put-manage-form.js');
                self.module.exports.renderPutManageForm(url, status_box, function (html) {
                    Client.render(html);
                    Client.postResponseToClient("CLOSE ks-put:");
                });
            }
        );
        return true;
    }

    //function putResponse(responseString) {
    //    if (responseString.substr(0, 3).toLowerCase() !== 'put')
    //        return false; // throw new Error("Invalid ks-put: " + responseString);
    //    throw new Error("Not Implemented: " + responseString);
    //    //Client.postResponseToClient(responseString);
    //    //return true;
    //}

};

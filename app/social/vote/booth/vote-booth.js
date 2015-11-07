/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object') (function() {

    // Events

    //self.addEventListener('submit', onFormEvent);
    //self.addEventListener('input', onFormEvent);
    //self.addEventListener('change', onFormEvent);

})();


// Worker Scripts
if(typeof module === 'object') (function() {
    var TEMPLATE_URL = 'app/social/vote/booth/vote-booth.html';

    module.exports.renderVoteBooth = function(commandString, callback) {
        var html_content = '';

        var match = /^vote\s+([a-f0-9]{8,16})\s+(\d+)\s*([\s\S]+)?$/im.exec(commandString);
        if (!match)
            return false;

        var pgp_id_public = match[1];
        var timestamp = match[2];
        var voteContent = match[3];


        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        KeySpaceDB.getContent(pgp_id_public, timestamp, function (err, voteEntryData) {
            if (err)
                throw new Error(err);

            if (!voteEntryData)
                throw new Error("Vote Entry missing: " + pgp_id_public + ' ' + timestamp);

            self.module = {exports: {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;
            var pgpEncryptedMessage = openpgp.cleartext.readArmored(voteEntryData.content);

            html_content = pgpEncryptedMessage.text;

            var xhr = new XMLHttpRequest();
            xhr.open("GET", TEMPLATE_URL, false);
            xhr.send();
            if(xhr.status !== 200)
                throw new Error("Error: " + xhr.responseText);
            callback(xhr.responseText
                    .replace(/{\$html_content}/gi, html_content)
            );

        });
    }
})();

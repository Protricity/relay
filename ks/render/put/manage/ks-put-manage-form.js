/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object')
(function() {

    var REFRESH_TIMEOUT = 20;

    // Events

    //self.addEventListener('submit', onFormEvent);
    //self.addEventListener('input', onFormEvent);
    //self.addEventListener('change', onFormEvent);

    //function onFormEvent(e, formElm) {
    //    if(!formElm) formElm = e.target.form ? e.target.form : e.target;
    //    if(formElm.nodeName.toLowerCase() !== 'form')
    //        return false;
    //
    //    switch(formElm.getAttribute('name')) {
    //        case 'ks-put-form':
    //            refreshHTTPPutForm(e, formElm);
    //            if(e.type === 'submit')
    //                e.preventDefault() ||
    //                submitHTTPPutForm(e, formElm);
    //            return true;
    //
    //        default:
    //            return false;
    //    }
    //}

})();

// Worker Script
else
    (function() {
        var TEMPLATE_URL = 'ks/render/put/manage/ks-put-manage-form.html';

        module.exports.renderPutManageForm = function(url, status_content, callback) {
            self.module = {exports: {}};
            importScripts('ks/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            KeySpaceDB.queryOne(url, function(err, contentEntry) {
                if(err)
                    throw new Error(err);

                if(!contentEntry)
                    throw new Error("Could not find: " + url);

                var openpgp = require('pgp/lib/openpgpjs/openpgp.js');
                //var pgpEncryptedMessage = openpgp.cleartext.readArmored(contentEntry.content);
                var pgpClearSignedMessage = openpgp.cleartext.readArmored(contentEntry.content);
                var verifiedContent = pgpClearSignedMessage.getText();
                //var encIDs = getEncryptionKeyIds(pgpClearSignedMessage.packets);
                //var pgp_id_public = encIDs[0].toHex().toUpperCase();

                var xhr = new XMLHttpRequest();
                xhr.open("GET", TEMPLATE_URL);
                xhr.onload = function () {
                    callback(xhr.responseText
                        .replace(/{\$url}/gi, url)
                        .replace(/{\$status_content}/gi, status_content)
                        .replace(/{\$content}/gi, verifiedContent)
                        .replace(/{\$path}/gi, contentEntry.path)
                        .replace(/{\$pgp_id_private}/gi, contentEntry.pgp_id_private)
                        .replace(/{\$pgp_id_public}/gi, contentEntry.pgp_id_public)
                        .replace(/{\$timestamp}/gi, contentEntry.timestamp)
                        .replace(/{\$user_id}/gi, contentEntry.user_id)
                        //.replace(/{\$content_escaped}/gi, contentEscaped)
                        //.replace(/{\$html_pgp_id_public_options}/gi, html_pgp_id_public_options)
                    );
                };
                xhr.send();
            });

            return true;
        };
    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
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

if (!module) var module = {};
if (!module.exports) module.exports = {};
// Worker Script
(function() {
    var TEMPLATE_URL = 'ks/render/put/manage/ks-put-manage-form.html';

    module.exports.renderPutManageForm = function(url, status_content, callback) {
        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(url);
        var pgp_id_public = match[4];
        var path = match[5] || '';

        var html_file_list = '';
        var html_entry_list = '';
        var html_content = '';
        var html_info = '';
        renderInfo(function() {
            renderFileList(function() {
                renderEntries(function() {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", TEMPLATE_URL);
                    xhr.onload = function () {
                        callback(xhr.responseText
                            .replace(/{\$path}/gi, path)
                            .replace(/{\$html_info}/gi, html_info)
                            .replace(/{\$html_file_list}/gi, html_file_list)
                            .replace(/{\$html_entry_list}/gi, html_entry_list)
                            .replace(/{\$html_content}/gi, html_content)
                        );
                    };
                    xhr.send();
                })
            })
        });

        function renderInfo(callback) {
            KeySpaceDB.queryOne(url, function (err, contentEntry) {
                if (err)
                    throw new Error(err);

                if (!contentEntry) {
                    status_content += (status_content ? '<br/>' : '') +
                        "<span class='error'>Not Found: " + url + "</span>";
                    contentEntry = {
                        content: null,
                        path: null,
                        //pgp_id_private: null,
                        pgp_id_public: null,
                        timestamp: null
                        //user_id: null
                    };
                    contentEntry.pgp_id_public = pgp_id_public;
                    contentEntry.path = path.toLowerCase();
                }

                var openpgp = require('pgp/lib/openpgpjs/openpgp.js');
                //var pgpEncryptedMessage = openpgp.cleartext.readArmored(contentEntry.content);
                //var verifiedContent = null;
                if (contentEntry.content) {
//                     var pgpClearSignedMessage = openpgp.cleartext.readArmored(contentEntry.content);
//                    html_content = contentEntry.content; // pgpClearSignedMessage.getText();

                    html_content = contentEntry.content
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;');

                }

                html_info = '<table>';

                if(url)
                    html_info +=
                        "\n\t<tr>" +
                        "\n\t\t<td class='name'>URL</td>" +
                        "\n\t\t<td class='value'><a href='" + url + "'>" + url + "</td>" +
                        "\n\t</tr>";

                if(contentEntry.pgp_id_public)
                    html_info +=
                        "\n\t<tr>" +
                        "\n\t\t<td class='name'>Public ID</td>" +
                        "\n\t\t<td class='value'>" + contentEntry.pgp_id_public + "</td>" +
                        "\n\t</tr>";

                if(contentEntry.timestamp)
                    html_info +=
                        "\n\t<tr>" +
                        "\n\t\t<td class='name'>Create Date</td>" +
                        "\n\t\t<td class='value'>" + timeSince(contentEntry.timestamp) + " ago</td>" +
                        "\n\t</tr>";


                html_info += '\n</table>';
                callback();
            });
        }


        function renderFileList(callback) {

            var new_html_file_list = '';
            KeySpaceDB.queryAll(url + '*', function (err, contentEntry) {
                if (err)
                    throw new Error(err);
                if (contentEntry) {

                } else {
                    html_file_list = '<table>' + new_html_file_list + '\n</table>';
                    callback();
                    return;
                }

                new_html_file_list += '\n\t<tr>';
                new_html_file_list += "\n\t\t<td>" + contentEntry.path + "</td>";
                new_html_file_list += '\n\t</tr>';
            });
        }

        function renderEntries(callback) {
            callback();
        }

        return true;
    };


    function timeSince(date) {
        var seconds = Math.floor((new Date() - date) / 1000);

        var interval = Math.floor(seconds / 31536000);

        if (interval > 1) {
            return interval + " years";
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + " months";
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + " days";
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + " hours";
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + " minutes";
        }
        return Math.floor(seconds) + " seconds";
    }


})();
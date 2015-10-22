/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object')
(function() {
    // Events

    self.addEventListener('submit', onFormEvent);
    //self.addEventListener('click', onClickEvent);
    //self.addEventListener('input', onFormEvent);
    //self.addEventListener('change', onFormEvent);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'ks-put-manage-add-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    addEntry(e, formElm);
                return true;

            case 'ks-put-manage-publish-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    publishEntry(e, formElm);
                return true;

            case 'ks-put-manage-edit-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    editEntry(e, formElm);
                return true;

            case 'ks-put-manage-delete-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    deleteEntry(e, formElm);
                return true;

            default:
                return false;
        }
    }

    function addEntry(e, formElm) {
        var url = formElm.url.value;

        var commandEvent = new CustomEvent('command', {
            detail: "PUT.FORM.ADD " + url,
            bubbles: true
        });
        formElm.dispatchEvent(commandEvent);
    }

    function publishEntry(e, formElm) {
        var uid = formElm.uid.value;

        var commandEvent = new CustomEvent('command', {
            detail: "PUT.PUBLISH " + uid,
            bubbles: true
        });
        formElm.dispatchEvent(commandEvent);
    }

    function editEntry(e, formElm) {
        var uid = formElm.uid.value;

        var commandEvent = new CustomEvent('command', {
            detail: "PUT.FORM.EDIT " + uid,
            bubbles: true
        });
        formElm.dispatchEvent(commandEvent);
    }

    function deleteEntry(e, formElm) {
        var uid = formElm.uid.value;

        var commandEvent = new CustomEvent('command', {
            detail: "PUT.DELETE " + uid,
            bubbles: true
        });
        formElm.dispatchEvent(commandEvent);
    }
})();

if (!module) var module = {exports:{}};
// Worker Scripts
(function() {
    var TEMPLATE_URL = 'ks/put/manage/render/ks-put-manage-form.html';

    module.exports.renderPutManageForm = function(url, status_content, callback) {
        self.module = {exports: {}};
        importScripts('ks/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        url = url.toLowerCase();
        var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(url);
        var pgp_id_public = (match[4] || '').split('.')[0];
        var path = match[5] || '';

        var classes = [];
        var entry_uid = null;
        var file_search_pattern = '';
        var html_commands = '';
        var html_file_list = '';
        var html_entry_list = '';
        var html_content = '';
        var html_info = '';
        renderInfo(function() {
            renderFileList(function() {
                renderEntries(function() {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", TEMPLATE_URL, false);
                    xhr.send();
                    if(xhr.status !== 200)
                        throw new Error("Error: " + xhr.responseText);
                    callback(xhr.responseText
                        .replace(/{\$classes}/gi, classes.length>0 ? ' ' + classes.join(' ') : '')
                        .replace(/{\$entry_uid}/gi, entry_uid)
                        .replace(/{\$url}/gi, url)
                        .replace(/{\$path}/gi, path)
                        .replace(/{\$file_search_pattern}/gi, file_search_pattern)
                        .replace(/{\$html_commands}/gi, html_commands)
                        .replace(/{\$html_info}/gi, html_info)
                        .replace(/{\$html_file_list}/gi, html_file_list)
                        .replace(/{\$html_entry_list}/gi, html_entry_list)
                        .replace(/{\$html_content}/gi, html_content)
                    );
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
                        content: "<code>No Content</code>",
                        path: null,
                        //pgp_id_private: null,
                        pgp_id_public: null,
                        timestamp: null
                        //user_id: null
                    };
                    contentEntry.pgp_id_public = pgp_id_public;
                    contentEntry.path = path.toLowerCase();

                    //html_commands += "\n<a href='#PUT.FORM " + url + "'>Add</a>";
                    classes.push('no-entry');

                } else {
                    entry_uid = contentEntry.pgp_id_public = ' ' + contentEntry.timestamp;
                    if(contentEntry.published === true)
                        classes.push('published');

                    // TODO: check for private/hidden files
                        //html_commands += "\n<a href='#PUT.PUBLISH " + uid + "'>Publish</a>";
                    //html_commands += "\n<a href='#PUT.FORM " + uid + "'>Edit</a>";
                    //html_commands += "\n<a href='#PUT.DELETE " + uid + "'>Delete</a>";
                }

                //if(typeof openpgp === 'undefined') {
                //    self.module = {exports: {}};
                //    importScripts('pgp/lib/openpgpjs/openpgp.js');
                //    var openpgp = self.module.exports;
                //}
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
                        "\n\t\t<td class='name'>Created</td>" +
                        "\n\t\t<td class='value'>" + timeSince(contentEntry.timestamp) + " ago</td>" +
                        "\n\t</tr>";


                html_info += '\n</table>';
                callback();
            });
        }


        function renderFileList(callback) {
            var dirHost = pgp_id_public ? 'http://' + pgp_id_public + '.ks' : '';
            var dirPath = path
                .replace(/\\/g, '/')
                .replace(/\/[^\/]*$/, '');
            var dirURL = dirHost +
                dirPath;
            file_search_pattern = dirURL + '/*';
            var new_html_file_list = '';

            new_html_file_list += '\n\t<tr>';
            new_html_file_list += "\n\t\t<td><a href='#PUT.MANAGE " + dirURL + "/'>.</a></td>";
            new_html_file_list += '\n\t</tr>';

            if(dirPath) {
                var parentDirPath = dirPath
                    .replace(/\\/g, '/')
                    .replace(/\/[^\/]*$/, '');
                var parentDirURL = dirHost + parentDirPath;
                new_html_file_list += '\n\t<tr>';
                new_html_file_list += "\n\t\t<td><a href='#PUT.MANAGE " + parentDirURL + "/'>..</a></td>";
                new_html_file_list += '\n\t</tr>';
            }

            var unique = [];
            KeySpaceDB.queryAll(file_search_pattern, function (err, contentEntry) {
                if (err)
                    throw new Error(err);

                if (contentEntry) {
                    var requestURL = "http://" + contentEntry.pgp_id_public + ".ks/" + contentEntry.path;
                    if(unique.indexOf(requestURL) === -1) {
                        new_html_file_list += '\n\t<tr>';
                        new_html_file_list += "\n\t\t<td><a href='#PUT.MANAGE " + requestURL + "'>" + contentEntry.path + "</a></td>";
                        new_html_file_list += '\n\t</tr>';
                        unique.push(requestURL);
                    }

                } else {
                    html_file_list = '<table>' + new_html_file_list + '\n</table>';
                    callback();
                }

            });
        }

        function renderEntries(callback) {
            var dirHost = pgp_id_public ? 'http://' + pgp_id_public + '.ks' : '';
            var requestURL = dirHost +
                path;
            file_search_pattern = requestURL;
            var new_html_entry_list = '';

            KeySpaceDB.queryAll(requestURL, function (err, contentEntry) {
                if (err)
                    throw new Error(err);

                if (contentEntry) {
                    var requestURL = "http://" + contentEntry.pgp_id_public + ".ks/?t=" + contentEntry.timestamp;
                    new_html_entry_list += '\n\t<tr>';
                    new_html_entry_list += "\n\t\t<td><a href='#PUT.MANAGE " + requestURL + "'>" + contentEntry.timestamp + "</a></td>";
                    new_html_entry_list += '\n\t</tr>';

                } else {
                    html_entry_list = '<table>' + new_html_entry_list + '\n</table>';
                    callback();
                }

            });
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
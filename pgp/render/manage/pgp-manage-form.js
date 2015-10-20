/**
 * Created by ari on 6/19/2015.
 */

// Client Script
if(typeof document === 'object')
    (function() {
        // Events

        self.addEventListener('submit', onFormEvent);
        //self.addEventListener('change', onFormEvent);
        self.addEventListener('input', onFormEvent);

        function onFormEvent(e, formElm) {
            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
            if(formElm.nodeName.toLowerCase() !== 'form')
                return false;

            switch(formElm.getAttribute('name')) {
                case 'pgp-manage-form':
                    refreshPGPManageForm(e, formElm);
                    if(e.type === 'submit')
                        submitPGPManageForm(e, formElm);
                    return true;

                default:
                    return false;
            }
        }

        function refreshPGPManageForm(e, formElm) {
            var selectedEntryElms = formElm.querySelectorAll('.pgp-id-box :checked');
            var spanSelectedKeysElm = formElm.getElementsByClassName('span-action')[0];
            var commandString = formElm.querySelector('[name=action]').value;
            if(!commandString)
                return;
            var multiCommand = (commandString[0] === '@' ? (function(){ commandString = commandString.substr(1); return true; })() : false);

            var match = /^(\w+)(?:.(\w+))?([\s\S]+)$/.exec(commandString);
            var action = match[1];

            var keyString = "(" + selectedEntryElms.length + ") Key" + (selectedEntryElms.length === 1 ? '' : 's');
            switch(action) {
                case 'default':
                    spanSelectedKeysElm.innerHTML = "Set Default Identity " + keyString; break;
                case 'passphrase':
                    spanSelectedKeysElm.innerHTML = "Change Passphrase on " + keyString; break;
                case 'sign':
                    spanSelectedKeysElm.innerHTML = "Sign Text with " + keyString; break;
                case 'verify':
                    spanSelectedKeysElm.innerHTML = "Verify Signature with " + keyString; break;
                case 'encrypt':
                    spanSelectedKeysElm.innerHTML = "Encrypt Content with " + keyString; break;
                case 'decrypt':
                    spanSelectedKeysElm.innerHTML = "Decrypt Content " + keyString; break;
                case 'export-public':
                    spanSelectedKeysElm.innerHTML = "Export Public Keys for " + keyString; break;
                case 'export':
                    spanSelectedKeysElm.innerHTML = "<span class='warn'>Export Private Keys</span> for " + keyString; break;
                case 'delete':
                    spanSelectedKeysElm.innerHTML = "Delete " + keyString; break;
                default:
                    spanSelectedKeysElm.innerHTML = "Selected " + keyString; break;
                    break;
            }
        }

        function submitPGPManageForm(e, formElm) {
            e.preventDefault();

            var commandString = formElm.querySelector('[name=action]').value;
            if(!commandString)
                return;
            var multiCommand = (commandString[0] === '@' ? (function(){ commandString = commandString.substr(1); return true; })() : false);

            var match = /^(\w+)(?:.(\w+))?([\s\S]+)$/.exec(commandString);
            var action = match[1];
            var subAction = match[2];
            var content = match[3];


            var selectedEntryElms = formElm.querySelectorAll('.pgp-id-box :checked');
            if(selectedEntryElms.length === 0) {
                setStatus(formElm, "<span class='error'>No IDs selected</span>");
                return;
            }
            setStatus(formElm, '');
            var selectedPrivateKeyIDs = [];
            for(var i=selectedEntryElms.length-1; i>=0; i--) (function(selectedEntryElm) {
                selectedPrivateKeyIDs.push(selectedEntryElm.getAttribute('value'));
            })(selectedEntryElms[i]);

            for(i=selectedEntryElms.length-1; i>=0; i--) {
                commandString = commandString
                    .replace(/\[\$id_private_list\]/gi, selectedPrivateKeyIDs.join(', '))
                    .replace(/\[\$id_private\]/gi, selectedPrivateKeyIDs[i]);

                var commandEvent = new CustomEvent('command', {
                    detail: commandString,
                    cancelable: true,
                    bubbles: true
                });
                document.dispatchEvent(commandEvent);
                if (commandEvent.defaultPrevented) {
                    setStatus(formElm, "<span class='success'>Command sent: </span><span class='command'>" + commandString + "</span>", true);
                    for (i = selectedEntryElms.length - 1; i >= 0; i--)
                        selectedEntryElms[i].checked = false;
                } else {
                    setStatus(formElm, "<span class='error'>Command not sent: </span><span class='command'>" + commandString + "</span>", true);

                }

                if(!multiCommand)
                    break;
            }
        }


        function setStatus(formElm, statusText, prepend, unique) {
            var statusElms = formElm.getElementsByClassName('status-box');
            for(var i=0; i<statusElms.length; i++) (function(statusElm) {
                var textDiv = document.createElement('div');
                textDiv.innerHTML = statusText;

                if(unique && statusElm.innerHTML.indexOf(textDiv.innerHTML) !== -1)
                    return;

                if(prepend) {
                    statusElm.firstChild
                        ? statusElm.insertBefore(textDiv, statusElm.firstChild)
                        : statusElm.appendChild(textDiv);
                    if(typeof prepend === 'number')
                        setTimeout(function () {
                            if(textDiv && textDiv.parentNode)
                                textDiv.parentNode.removeChild(textDiv);
                        }, prepend * 1000);
                } else {
                    statusElm.innerHTML = statusText;
                }
            })(statusElms[i]);
        }


        // For HTTP Content Database access
        includeScript('ks/ks-db.js');

        function includeScript(scriptPath) {
            var head = document.getElementsByTagName('head')[0];
            if (head.querySelectorAll('script[src=' + scriptPath.replace(/[/.]/g, '\\$&') + ']').length === 0) {
                var newScript = document.createElement('script');
                newScript.setAttribute('src', scriptPath);
                head.appendChild(newScript);
            }
        }

    })();

// Worker Script
else
    (function() {
        module.exports.renderPGPManageForm = renderPGPManageForm;
        function renderPGPManageForm (status_content, callback) {

            self.exports = {};
            self.module = {exports: {}};
            importScripts('ks/ks-db.js');
            var KeySpaceDB = self.module.exports.KeySpaceDB;

            var html_manage_entries = '';

            // Query private keys
            var path = '/.private/id';
            var count = 0;
            KeySpaceDB.queryAll(path, function(err, contentEntry) {
                if(err)
                    throw new Error(err);

                if(contentEntry) {

                    count++;
                    renderPGPManageFormEntry(contentEntry, function(html) {
                        html_manage_entries += html;
                    });

                } else {
                    if(count === 0)
                        status_content = (status_content ? status_content + "<br/>" : '') + "<strong>No PGP Identities found</strong><br/>" +
                            "<span class='info'>You may <a href='#KEYGEN'>Generate</a>  a new PGP Key Pair Identity</span>";

                    var TEMPLATE_URL = "pgp/render/manage/pgp-manage-form.html";

                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", TEMPLATE_URL, false);
                    xhr.send();
                    if(xhr.status !== 200)
                        throw new Error("Error: " + xhr.responseText);
                    callback(xhr.responseText
                        .replace(/{\$status_content}/gi, status_content || '')
                        .replace(/{\$html_manage_entries}/gi, html_manage_entries || '')
                    );
                }
            });


            return true;
        }

        module.exports.renderPGPManageFormEntry = renderPGPManageFormEntry;
        function renderPGPManageFormEntry(contentEntry, callback) {
            var MANAGE_TEMPLATE_ENTRY = "\
            <div class='pgp-manage-entries:'>\
                <label>\n\
                    <fieldset class='pgp-id-box pgp-id-box:{$id_public}'>\n\
                        <legend class='title'>\n\
                            <input type='checkbox' value='{$id_public}' name='selected:{$id_public}'/> <span class='user'>{$user_id}</span>\n\
                        </legend>\n\
                        <strong>Public ID:&nbsp;&nbsp;</strong> <span class='fingerprint'>{$id_public}</span><br/>\n\
                        <strong>Private ID:&nbsp;</strong> <span class='fingerprint'>{$id_private}</span><br/>\n\
                        <strong>User ID:&nbsp;&nbsp;&nbsp;&nbsp;</strong> <span class='user'>{$user_id}</span><br/>\n\
                        <strong>Passphrase:&nbsp;</strong> {$passphrase_required}<br/>\n\
                    </fieldset>\n\
                </label>\
            </div>\
";

            // Callback
            callback(MANAGE_TEMPLATE_ENTRY
                    .replace(/{\$id_private}/gi, contentEntry.pgp_id_private)
                    .replace(/{\$id_public}/gi, contentEntry.pgp_id_public)
                    .replace(/{\$id_private_short}/gi, contentEntry.pgp_id_private.substr(contentEntry.pgp_id_private.length - 8))
                    .replace(/{\$id_public_short}/gi, contentEntry.pgp_id_public.substr(contentEntry.pgp_id_public.length - 8))
                    //.replace(/{\$block_private}/gi, privateKeyBlock)
                    //.replace(/{\$block_public}/gi, privateKeyData.block_public)
                    .replace(/{\$user_id}/gi, contentEntry.user_id.replace(/</g, '&lt;'))
                    //.replace(/{\$user_name}/gi, privateKeyData.user_name || '')
                    //.replace(/{\$user_email}/gi, privateKeyData.user_email || '')
                    //.replace(/{\$user_comment}/gi, privateKeyData.user_comment || '')
                    .replace(/{\$passphrase_required}/gi, contentEntry.passphrase_required ? "Yes" : "No")
                //.replace(/{\$is_default}/gi, privateKeyData.default === '1' ? "<strong>Yes</strong>" : "No")
                //.replace(/{\$class}/gi, privateKeyData.default === '1' ? " pgp-id-box-default" : "")
                //.replace(/{\$default}/gi, privateKeyData.default)
            );
        }

    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
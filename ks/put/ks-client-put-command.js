/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutCommands = function(Client) {
    Client.addCommand(putCommand);
    Client.addResponse(putResponse);

    /**
     *
     * @param commandString PUT [path] [content]
     */
    function putCommand(commandString) {
        var match = /^put(?:\.(script|preview|form|manage|publish|delete))?/im.exec(commandString);
        if (!match)
            return false;

        var subCommand = (match[1] || '').toLowerCase();

        switch (subCommand) {
            case '':
            case 'form':
                return putFormCommand(commandString);
            //case 'preview':
            //    return putPreviewCommand(commandString);
            case 'script':
                return putScriptCommand(commandString);
            case 'manage':
                return putManageCommand(commandString);
            case 'delete':
                return putDeleteCommand(commandString);
            case 'publish':
                return putPublishCommand(commandString);
            default:
                throw new Error("Invalid command: " + commandString);
        }
    }

    function putPublishCommand(commandString) {
        var match = /^put\.publish\s*([\s\S]*)$/im.exec(commandString);
        if (!match)
            throw new Error("Invalid Command: " + commandString);

        var ksURL = match[1];
        match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(ksURL);
        if (!match)
            throw new Error("Invalid Keyspace URI: " + url);
    }

    // TODO: review command
    function putFormCommand(commandString) {
        var match = /^put(?:\.(form))?(?:\s+--id\s+(\w+))?(?:\s+([\s\S]+))?$/im.exec(commandString);
        if (!match)
            throw new Error("Invalid Command: " + commandString);

        //var path = match[2] || '~';
        var showForm = (match[1] || '').toLowerCase() === 'form';
        var pgp_id_public = match[2] || null;
        //var putPath = (match[3] || '').trim();
        var content = (match[3] || '').trim();
        if (!content)
            showForm = true;

        var status_content = '';
        if (!showForm) {
            try {
                self.module = {exports: {}};
                importScripts('ks/ks-db.js');
                var KeySpaceDB = self.module.exports.KeySpaceDB;

                // Only encrypted messages will be accepted
                self.module = {exports: {}};
                importScripts('pgp/lib/openpgpjs/openpgp.js');
                var openpgp = self.module.exports;
                var pgpMessage = openpgp.cleartext.readArmored(content);
                var pgpSignedContent = pgpMessage.armor();

                KeySpaceDB.verifyAndAddContentToDB(pgpSignedContent,
                    function (err, insertData) {
                        if (err)
                            throw new Error(err);

                        var url = "http://" + insertData.pgp_id_public + '.ks/' + insertData.path;

                        Client.sendWithSocket(commandString);
                        status_content = "<strong>Key Space</strong> content stored <span class='success'>Successful</span>: " +
                            "<br/><a href='" + url + "'>" + insertData.path + "</a>";

                        self.module = {exports: {}};
                        importScripts('ks/put/render/manage/ks-put-manage-form.js');
                        self.module.exports.renderPutManageForm(url, status_content, function (html) {
                                Client.replace('ks-put:', html);
                            });
                    },
                    pgp_id_public
                );
                return true;

            } catch (e) {
                status_content = "<span class='error'>" + e.message + "</span>";
                console.error(e);
            }
        }

        // If anything goes wrong, show form
        self.module = {exports: {}};
        importScripts('ks/put/render/form/ks-put-form.js');
        self.module.exports.renderPutForm(content, status_content, function (html) {
            Client.render(html);
        });

        return true;
    }

    function putScriptCommand(commandString) {
        var match = /^put\.script\s*([\s\S]*)$/im.exec(commandString);
        if (!match)
            throw new Error("Invalid Command: " + commandString);

        var scriptURL = match[1];
        match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(scriptURL);
        if (!match)
            throw new Error("Invalid URI: " + url);

        var scheme = match[2],
            host = match[4],
            scriptPath = match[5].toLowerCase() || '',
            queryString = match[6] || '';

        var scriptFound = null;
        self.module = {exports: {}};
        importScripts('ks/ks-content-scripts.js');
        var scripts = self.module.exports.getContentScripts();
        for (var i = 0; i < scripts.length; i++) {
            var opts = scripts[i];
            var selectedHTML = '';
            if (scriptPath && scriptPath === opts[0]) {
                scriptFound = opts;
                selectedHTML = ' selected="selected"';
            }
        }

        var fieldValues = {};
        var queryStringPairs = queryString.split(/^\?|&/g);
        for (i = 0; i < queryStringPairs.length; i++) {
            var splitPair = queryStringPairs[i].split('=', 2);
            if (splitPair[0])
                fieldValues[decodeURIComponent(splitPair[0])] = decodeURIComponent(splitPair[1]) || true;
        }


        if (scriptFound) {
            try {
                self.module = {exports: {}};
                importScripts(scriptFound[0]);
                self.module.exports.runScript(fieldValues, function (html) {
                    Client.render(html
                            .replace(/{\$command_string}/ig, commandString)
                    );
                });
                return true;

            } catch (e) {
                console.error(e);
            }
        }


        self.module = {exports: {}};
        importScripts('ks/put/render/script/ks-put-script-form.js');
        self.module.exports.renderPutScriptForm(commandString, function (html) {
                Client.render(html);
            });

        return true;
    }


    function putManageCommand(commandString, status_content) {
        var match = /^put.manage\s*(\S+)?$/im.exec(commandString);
        if (!match)
            throw new Error("Invalid Command: " + commandString);

        var contentURL = match[1] || '/';

        self.module = {exports: {}};
        importScripts('ks/put/render/manage/ks-put-manage-form.js');
        self.module.exports.renderPutManageForm(contentURL, status_content, function (html) {
            Client.render(html);
        });

        return true;
    }


    function putResponse(responseString) {
        if (responseString.substr(0, 3).toLowerCase() !== 'put')
            return false; // throw new Error("Invalid ks-put: " + responseString);
        throw new Error("Not Implemented: " + responseString);
        //Client.postResponseToClient(responseString);
        //return true;
    }


};

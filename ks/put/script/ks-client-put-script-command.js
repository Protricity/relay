/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutScriptCommand = function(Client) {
    Client.addCommand(putScriptCommand);

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

};
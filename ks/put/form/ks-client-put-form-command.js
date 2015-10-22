/**
 * Created by ari.
 */
if (!module) var module = {exports:{}};
module.exports.initClientKSPutFormCommand = function(Client) {
    Client.addCommand(putFormCommand);
    Client.addCommand(putFormAddCommand);

    /**
     * @param commandString PUT [path] [content]
     */
    function putFormCommand(commandString) {
        var match = /^put$|^put\.form(?:\s+([\s\S]+))?$/im.exec(commandString);
        if (!match)
            return false;

        var content = (match[2] || '').trim();

        var status_content = '';

        // If anything goes wrong, show form
        self.module = {exports: {}};
        importScripts('ks/put/form/render/ks-put-form.js');
        self.module.exports.renderPutForm(content, status_content, function (html) {
            Client.render(html);
        });

        return true;
    }
    /**
     * @param commandString PUT [path] [content]
     */
    function putFormAddCommand(commandString) {
        var match = /^put\.form\.add(?:\s+([\s\S]+))?$/im.exec(commandString);
        if (!match)
            return false;

        var path = (match[2] || '').trim();
        console.info("TODO: path", path);

        var status_content = '';

        // If anything goes wrong, show form
        self.module = {exports: {}};
        importScripts('ks/put/form/render/ks-put-form.js');
        self.module.exports.renderPutForm('', status_content, function (html) {
            Client.render(html);
        });

        return true;
    }

    //
    //function putResponse(responseString) {
    //    if (responseString.substr(0, 3).toLowerCase() !== 'put')
    //        return false; // throw new Error("Invalid ks-put: " + responseString);
    //    throw new Error("Not Implemented: " + responseString);
    //    //Client.postResponseToClient(responseString);
    //    //return true;
    //}


};

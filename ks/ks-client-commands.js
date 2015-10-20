/**
 * Created by ari.
 */
(function() {

    //if(typeof Client === 'undefined')
    //var Client = require('../client/client.js').Client;

    Client.addCommand(putCommand);
    Client.addCommand(getCommand);

    Client.addResponse(putResponse);
    Client.addResponse(getResponse);
    Client.addResponse(httpResponse);
    Client.addResponse(ksChallengeResponse);

    //var challengeValidations = [];

    function ksChallengeCommand(commandString) {
        var match = /^ks-challenge\s+([\s\S]+)$/im.exec(commandString);
        if(!match)
            return false;

        var encryptedChallengeString = match[1];

        var openpgp = require('pgp/lib/openpgpjs/openpgp.js');
        var pgpEncryptedMessage = openpgp.message.readArmored(encryptedChallengeString);
        var pgp_id_public = pgpEncryptedMessage.getEncryptionKeyIds()[0].toHex().toUpperCase();

        var requestURL = "http://" + pgp_id_public + ".ks/.private/id";
        getKeySpaceDB().queryOne(requestURL, function (err, contentData) {
            if (err)
                throw new Error(err);

            if (!contentData)
                throw new Error("Could not find Private Key: " + requestURL);

            var privateKey = openpgp.key.readArmored(contentData.content).keys[0];

            // TODO: handle passphrase
            openpgp.decryptMessage(privateKey, pgpEncryptedMessage)
                .then(function(decryptedChallenge) {
                //challengeValidations.push([pgp_id_public, decryptedChallenge]);
                Client.sendWithSocket("KS-VALIDATE " + decryptedChallenge);

            }).catch(console.error);
        });

        return true;
    }

    function ksChallengeResponse(responseString) {
        var match = /^ks-challenge\s+([\s\S]+)$/im.exec(responseString);
        if(!match)
            return false;

        return ksChallengeCommand(responseString);
    }

    /**
     *
     * @param commandString PUT [path] [content]
     */
    function putCommand(commandString) {
        var match = /^put(?:\.(script|preview|form|manage|publish|delete))?/im.exec(commandString);
        if(!match)
            return false;

        var subCommand = (match[1] || '').toLowerCase();

        switch(subCommand) {
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
        if(!match)
            throw new Error("Invalid Command: " + commandString);

        var ksURL = match[1];
        match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(ksURL);
        if(!match)
            throw new Error("Invalid Keyspace URI: " + url);
    }

    // TODO: review command
    function putFormCommand(commandString) {
        var match = /^put(?:\.(form))?(?:\s+--id\s+(\w+))?(?:\s+(\S+))?(?:\s+([\s\S]+))?$/im.exec(commandString);
        if(!match)
            throw new Error("Invalid Command: " + commandString);

        //var path = match[2] || '~';
        var showForm = (match[1] || '').toLowerCase() === 'form';
        var pgp_id_public = match[2] || null;
        var putPath = (match[3] || '').trim();
        var content = (match[4] || '').trim();
        if(!content)
            showForm = true;

        var status_content = '';
        if(!showForm) {
            try {
                // Only encrypted messages will be accepted
                var openpgp = require('pgp/lib/openpgpjs/openpgp.js');
                var pgpMessage = openpgp.cleartext.readArmored(content);
                var pgpSignedContent = pgpMessage.armor();

                getKeySpaceDB().verifyAndAddContentToDB(pgpSignedContent,
                    function (err, insertData) {
                        if (err)
                            throw new Error(err);

                        var url = "http://" + insertData.pgp_id_public + '.ks/' + insertData.path;

                        Client.sendWithSocket(commandString);
                        status_content = "<strong>Key Space</strong> content stored <span class='success'>Successful</span>: " +
                            "<br/><a href='" + url + "'>" + insertData.path + "</a>";

                        require('ks/render/put/manage/ks-put-manage-form.js')
                            .renderPutManageForm(url, status_content, function(html) {
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
        require('ks/render/put/form/ks-put-form.js')
            .renderPutForm('', status_content, function(html) {
                Client.render(html);
            });

        return true;
    }

    function putScriptCommand(commandString) {
        var match = /^put\.script\s*([\s\S]*)$/im.exec(commandString);
        if(!match)
            throw new Error("Invalid Command: " + commandString);

        var scriptURL = match[1];
        match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(scriptURL);
        if(!match)
            throw new Error("Invalid URI: " + url);

        var scheme = match[2],
            host = match[4],
            scriptPath = match[5].toLowerCase() || '',
            queryString = match[6] || '';

        var scriptFound = null;
        var scripts = require('ks/ks-content-scripts.js').getContentScripts();
        for(var i=0; i<scripts.length; i++) {
            var opts = scripts[i];
            var selectedHTML = '';
            if(scriptPath && scriptPath === opts[0]) {
                scriptFound = opts;
                selectedHTML = ' selected="selected"';
            }
        }

        var fieldValues = {};
        var queryStringPairs = queryString.split(/^\?|&/g);
        for(i=0; i<queryStringPairs.length; i++) {
            var splitPair = queryStringPairs[i].split('=', 2);
            if(splitPair[0])
                fieldValues[decodeURIComponent(splitPair[0])] = decodeURIComponent(splitPair[1]) || true;
        }


        if(scriptFound) {
            try {
                require(scriptFound[0])
                    .runScript(fieldValues, function(html) {
                        Client.render(html
                            .replace(/{\$command_string}/ig, commandString)
                        );
                    });
                return true;

            } catch (e) {
                console.error(e);
            }
        }


        require('ks/render/put/script/ks-put-script-form.js')
            .renderPutScriptForm(commandString, function(html) {
                Client.render(html);
            });

        return true;
    }


    //function putPreviewCommand(commandString) {
    //    var match = /^put.preview\s*([\s\S]+)$/im.exec(commandString);
    //    if(!match)
    //        throw new Error("Invalid Command: " + commandString);
    //
    //    require('ks/render/put/preview/ks-put-preview-form.js')
    //        .renderPutPreviewForm(commandString, function(html) {
    //            Client.replace('ks-put-preview:', html);
    //        });
    //
    //    return true;
    //}



    function putManageCommand(commandString, status_content) {
        var match = /^put.manage\s*(\S+)?$/im.exec(commandString);
        if(!match)
            throw new Error("Invalid Command: " + commandString);

        var contentURL = match[1] || '/';

        require('ks/render/put/manage/ks-put-manage-form.js')
            .renderPutManageForm(contentURL, status_content, function(html) {
                Client.render(html);
            });

        return true;
    }


    function putResponse(responseString) {
        if(responseString.substr(0,3).toLowerCase() !== 'put')
            return false; // throw new Error("Invalid ks-put: " + responseString);
        throw new Error("Not Implemented: " + responseString);
        //Client.postResponseToClient(responseString);
        //return true;
    }


    /**
     *
     * @param commandString GET [URL]
     */
    function getCommand(commandString) {
        var match = /^get\s+/i.exec(commandString);
        if(!match)
            return false;

        executeRemoteGETRequest(commandString, function(responseString) {
            renderResponseString(responseString);
        });
    }

    function getResponse(requestString) {
        var match = /^get/i.exec(requestString); // (?:\w+:\/\/)?([a-f0-9]{8,})(?:\.ks)(\/@pgp.*)$
        if(!match)
            return false;

        executeLocalGETRequest(requestString, function(responseString) {
            Client.sendWithSocket(responseString);
        });
        return true;
    }

    // TODO: default content on response http only?
    function httpResponse(responseString) {
        if(responseString.substr(0,4).toLowerCase() !== 'http')
            return false;

        addURLsToDB(responseString);

        var responseCode = getResponseStatus(responseString)[0];
        if(responseCode === 200) {
            renderResponseString(responseString);

        } else {
            var requestURL = getContentHeader(responseString, 'Request-Url');
            if(!requestURL)
                throw new Error("Unknown request-url for response: Header is missing");
            var browserID = getContentHeader(responseString, 'Browser-ID');
            if(!browserID)
                throw new Error("Unknown browser-id for response:\n" + responseString);
            var requestString = "GET " + requestURL +
                "\nBrowser-ID: " + browserID + "\n";

            executeLocalGETRequest(requestString, function(responseString, responseCode) {
                if (responseCode === 200) {
                    responseString = protectHTMLContent(responseString);
                    renderResponseString(responseString);

                } else {
                    processResponseWithDefaultContent(responseString, function (responseString) {
                        renderResponseString(responseString);
                    });
                }
            });
        }
        return true;
    }



    function addURLsToDB(responseContent) {
        var referrerURL = getContentHeader(responseContent, 'Request-Url');
        if(!referrerURL)
            throw new Error("Unknown Request-Url for response: Header is missing");

        responseContent.replace(/<a[^>]+href=['"]([^'">]+)['"][^>]*>([^<]+)<\/a>/gi, function(match, url, text, offset, theWholeThing) {
            getKeySpaceDB().addURLToDB(url, referrerURL);
        });
    }

    var httpBrowserID = 1;
    var requestIDCount = 0;
    var pendingGETRequests = {};
    function executeRemoteGETRequest(requestString, callback) {
        var browserID = getContentHeader(requestString, 'Browser-ID');
        if(!browserID)
            requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

        // Send request regardless of local cache
        var requestID = 'C' + requestIDCount++;
        requestString = addContentHeader(requestString, 'Request-ID', requestID);
        pendingGETRequests[requestID] = callback; // TODO: reuse same callback? should be fine.
        Client.sendWithSocket(requestString);

        // Check local cache to see what can be displayed while waiting
        var requestURL = getRequestURL(requestString);
        var passedResponseHeaders = "\nBrowser-ID: " + browserID;
        passedResponseHeaders += "\nRequest-ID: " + requestID;

        logKSRequest(requestURL, 'O');
        getKeySpaceDB().queryOne(requestURL, function (err, contentData) {
            if(err)
                throw new Error(err);

            if(contentData) {
                // TODO: verify and decrypt content on the fly?
                var signedBody = protectHTMLContent(contentData.content_verified);

                require('ks/render/browser/ks-browser.js')
                    .renderResponse(
                        signedBody,
                        requestURL,
                        200,
                        "OK",
                        passedResponseHeaders,
                        callback
                    );

            } else {
                // If nothing found, show something, sheesh
                require('ks/render/browser/ks-browser.js')
                    .renderResponse(
                        "<p>Request sent...</p>",
                        requestURL,
                        202,
                        "Request Sent",
                        passedResponseHeaders,
                        callback
                    );
            }
        });
    }

    function executeLocalGETRequest(requestString, callback) {
        var browserID = getContentHeader(requestString, 'Browser-ID');
        if(!browserID)
            requestString = addContentHeader(requestString, 'Browser-ID', browserID = httpBrowserID++);

        var requestURL = getRequestURL(requestString);
        var requestID = getContentHeader(requestString, 'Request-ID');
        var passedResponseHeaders = "\nBrowser-ID: " + browserID;
        if(requestID)
            passedResponseHeaders += "\nRequest-ID: " + requestID;
        logKSRequest(requestURL, 'I');
        getKeySpaceDB().queryOne(requestURL, function (err, contentData) {
            if(err)
                throw new Error(err);

            if(contentData) {
                // TODO: verify and decrypt content on the fly? Maybe don't verify things being sent out

                require('ks/render/browser/ks-browser.js')
                    .renderResponse(
                        contentData.content,
                        requestURL,
                        200,
                        "OK",
                        passedResponseHeaders,
                        callback
                    );

            } else {

                importScripts('ks/render/browser/pages/404.js');
                get404IndexTemplate(requestString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                    responseHeaders += passedResponseHeaders;

                    require('ks/render/browser/ks-browser.js')
                        .renderResponse(
                            defaultResponseBody,
                            requestURL,
                            responseCode,
                            responseText,
                            responseHeaders,
                            callback
                        );
                });

            }
        });
    }


    function processResponseWithDefaultContent(responseString, callback) {
        var responseCode = getResponseStatus(responseString)[0];

        if(responseCode === 200) {
            callback(responseString);

        } else {
            var requestURL = getContentHeader(responseString, 'Request-Url');
            if(!requestURL)
                throw new Error("Unknown request-url for response: Header is missing");
            var browserID = getContentHeader(responseString, 'Browser-ID');
            if(!browserID)
                throw new Error("Unknown browser-id for response:\n" + responseString);
            var requestString = addContentHeader("GET " + requestURL, "Browser-ID", browserID);

            // Non-200 so grab local version or default content
            getDefaultContentResponse(requestString, function(defaultResponseBody, responseCode, responseText, responseHeaders) {
                responseHeaders += "\nBrowser-ID: " + browserID;

                require('ks/render/browser/ks-browser.js')
                    .renderResponse(
                        defaultResponseBody,
                        requestURL,
                        responseCode,
                        responseText,
                        responseHeaders,
                        callback
                    );
            });
        }

    }

    // TODO default content public config
    var defaultContentResponses = [
        [/^\/?home\/?$/i, function(commandString, callback) { importScripts('ks/pages/home/user-index.js'); getUserIndexTemplate(commandString, callback); }],
        [/^\/?$/, function(commandString, callback) { importScripts('ks/pages/index.js'); getRootIndexTemplate(commandString, callback); }]
    ];
    var getDefaultContentResponse = function(requestString, callback) {
        var requestURL = getRequestURL(requestString);
        var match = requestURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var path = match[5] || '';
        if(path === '~')
            path = '~/';

        var browserID = getContentHeader(requestString, 'Browser-ID');
        if(!browserID)
            throw new Error("No Browser-ID Header");

        function fixedCallback(defaultResponseBody, responseCode, responseText, responseHeaders) {
            return callback(defaultResponseBody,
                responseCode,
                responseText,
                addContentHeader(responseHeaders, 'Browser-ID', browserID)
            );
        }


        for(var i=0; i<defaultContentResponses.length; i++) {
            //console.log(defaultContentResponses[i], contentURLPath, contentURL);
            if(defaultContentResponses[i][0].test(path)) {
                defaultContentResponses[i][1](requestString, fixedCallback);
                return;
            }
        }

        importScripts('ks/pages/404.js');
        get404IndexTemplate(requestString, fixedCallback);
    };

    function renderResponseString(responseString) {
        var requestURL = getContentHeader(responseString, 'Request-URL');
        if(!requestURL)
            throw new Error("Unknown request-url for response: Header is missing");

        //var urlData = parseURL(requestURL);
        //if(!urlData.host)
        //    throw new Error("Invalid Host: " + requestURL);

        var browserID = getContentHeader(responseString, 'Request-URL');
        if(!browserID)
            throw new Error("Invalid Browser ID");

        require('ks/render/browser/ks-browser.js')
            .renderBrowser(responseString, function(html) {
                Client.render(html);
            });
    }

    function protectHTMLContent(htmlContent) {
        var match = /(lt;|<)[^>]+(on\w+)=/ig.exec(htmlContent);
        if(match)
            throw new Error("Dangerous HTML: " + match[2]);

        return htmlContent;
    }

    var logKSRequest = function(requestURL, dir) {
        var match = requestURL.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));
        var host = match[4];
        if(!host)
            throw new Error("Invalid Host: " + requestURL);

        var logExport = require('client/render/log/log-window.js');

        // Render log window
        logExport.renderLogWindow(function(html) {
            Client.render(html);
        });

        var requestURLAnchorHTML = "<a href='" + requestURL + "'>" + requestURL + "</a>";
        logExport.renderLogEntry(requestURLAnchorHTML, dir, function(html) {
            Client.appendChild("log-content:", html);
        });
    };

    // Request/Response methods

    function getResponseStatus(responseString) {
        var match = /^http\/1.1 (\d+) ?(.*)$/im.exec(responseString);
        if(!match)
            throw new Error("Invalid HTTP Response: " + responseString);
        return [parseInt(match[1]), match[2]];
    }

    function getRequestURL(requestString) {
        var firstLine = requestString.split(/\n/)[0];
        var match = /^get\s*(\S*)(\s+HTTP\/1.1)?$/i.exec(firstLine);
        if(!match)
            throw new Error("Invalid GET Request: " + requestString);
        return match[1];
    }

    function getContentHeader(contentString, headerName) {
        var match = new RegExp('^' + headerName + ': ([^$]+)$', 'mi').exec(contentString.split(/\n\n/)[0]);
        if(!match)
            return null;
        return match[1];
    }

    function addContentHeader(contentString, headerName, headerValue) {
        if(getContentHeader(contentString, headerName))
            throw new Error("Content already has Header: " + headerName);
        var lines = contentString.split(/\n/);
        lines.splice(lines.length >= 1 ? 1 : 0, 0, headerName + ": " + headerValue);
        return lines.join("\n");
    }

    function getKeySpaceDB() {
        if(typeof self.KeySpaceDB === 'undefined') {
            if(typeof importScripts === "function")
                importScripts('ks/ks-db.js');
            else
                self.KeySpaceDB = require('./ks-db.js').KeySpaceDB;
        }
        return self.KeySpaceDB;
    }

    function require(path) {
        self.module = {exports: {}};
        importScripts(path);
        return self.module.exports;
    }

    //
    //function parseURL(url) {
    //    var matches = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(url);
    //    return {
    //        url: url,
    //        scheme: matches[2],
    //        host: matches[4],
    //        path: matches[5] || '',
    //        query: matches[7],
    //        fragment: matches[9]
    //    };
    //}

    exports.test = function() {
        putCommand();
        console.log('Test Complete: ' + __filename);
    };

})();

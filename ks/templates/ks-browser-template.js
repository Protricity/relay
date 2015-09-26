/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.rest = Templates.rest || {};
Templates.rest.browser = function(responseText, callback) {
    // Template
    var HTTP_BROWSER_TEMPLATE = "\
        <article class='channel ks-browser:{$browser_id} ks-browser ks-response-{$response_code}' data-browser-id='{$browser_id}'>\n\
            <script src='ks/ks-listeners.js'></script>\n\
            <link rel='stylesheet' href='ks/ks.css' type='text/css'>\n\
            <legend class='title'>\n\
                <span class='command'>GET</span> <span class='url'>{$request_url}</span>\n\
            </legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE ks-browser:{$browser_id}'>[-]</a><!--\
             --><a class='title-command-maximize' href='#MAXIMIZE ks-browser:{$browser_id}'>[+]</a><!--\
             --><a class='title-command-close' href='#CLOSE ks-browser:{$browser_id}'>[x]</a>\n\
            </div>\n\
            <nav>\n\
                <form name='ks-browser-navigation-form'>\n\
                    <button type='submit' name='back'>&#8678;</button>\n\
                    <button type='submit' name='forward'>&#8680;</button>\n\
                    <button type='submit' name='home'>&#8962;</button>\n\
                    <input name='url' type='text' value='{$request_url}' />\n\
                    <button type='submit' name='navigate'>&#8476;</button>\n\
                </form>\n\
            </nav>\n\
            <section class='ks-body'>{$response_body}</section>\n\
            <footer class='ks-status'>{$response_code} {$response_text}</footer>\n\
        </article>";


    var headerBody = responseText;
    var responseBody = '';
    var splitPos = headerBody.indexOf("\n\n");
    if(splitPos !== -1) {
        headerBody = responseText.substr(0, splitPos);
        responseBody = responseText.substr(splitPos).trim();
    }
    var headers = headerBody.split(/\n/);
    var headerFirstLine = headers.shift();
    var headerValues = {};
    for(var i=0; i<headers.length; i++) {
        var splitHeader = headers[i].split(': ');
        headerValues[splitHeader[0].toLowerCase()] = splitHeader.length > 0 ? splitHeader[1] : true;
    }
    var match = /^http\/1.1 (\d+) ?(.*)$/i.exec(headerFirstLine);
    if(!match)
        throw new Error("Invalid HTTP Response: " + headerFirstLine);
    var responseCode = parseInt(match[1]);
    var responseCodeText = match[2];
    var requestURL = headerValues['request-url'];
    if(!requestURL)
        throw new Error("Unknown request-url for response: Header is missing");
    var browserID = headerValues['browser-id'];
    if(!browserID)
        throw new Error("Unknown browser-id for response:\n" + responseText);

    //KeySpaceDB.listURLIndex(contentURL, function(urls) {
    //    var pathHTML = "<ul class='path-index'>";
    //
    //    for(var i=0; i<urls.length; i++)
    //        pathHTML += "\t<li><a href='" + urls[i][0] + "'>" + urls[i][1] + "</a></li>";
    //    pathHTML += "</ul>";
    //    TEMPLATE_INDEX = TEMPLATE_INDEX.replace(/{\$html_ul_index}/gi, pathHTML);
    //    callback(TEMPLATE_INDEX);
    //});
    //

    // Callback
    callback(HTTP_BROWSER_TEMPLATE
        .replace(/{\$response_body}/gi, responseBody)
        .replace(/{\$response_code}/gi, responseCode)
        .replace(/{\$response_text}/gi, responseCodeText)
        .replace(/{\$browser_id}/gi, browserID)
        .replace(/{\$request_url}/gi, requestURL)
    );

};

/**
 * Created by ari on 6/19/2015.
 */


var Templates = Templates || {};
Templates.ks = Templates.ks || {};
Templates.ks.put = Templates.ks.put || {};


Templates.ks.put.form = function(content, callback) {
    var TEMPLATE_URL = 'ks/templates/ks-put-template.html';

    var xhr = new XMLHttpRequest();
    xhr.open("GET", TEMPLATE_URL);
    xhr.onload = function () {
        callback(xhr.responseText
            .replace(/{\$content}/gi, content || '')
        );
    };
    xhr.send();
    return true;
};
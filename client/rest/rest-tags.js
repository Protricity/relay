/**
 * Created by ari on 9/16/2015.
 */


var templateTags = [
    [/{\rest::index(?:\s+([^}]+))?}/gi, function(cb, tagString, pathString) {
        if(typeof RestDB !== 'function')
            importScripts('rest/rest-db.js');

        RestDB.listURLIndex(pathString, function(urls) {
            var pathHTML = "<ul class='path-index'>";
            for(var i=0; i<urls.length; i++)
                pathHTML += "\t<li><a href='" + urls[i][0] + "'>" + urls[i][1] + "</a></li>";
            pathHTML += "</ul>";
            cb(pathHTML);
        });
    }]
];

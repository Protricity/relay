/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object') (function() {

    // Events

    //self.addEventListener('submit', onFormEvent);
    //self.addEventListener('input', onFormEvent);
    //self.addEventListener('change', onFormEvent);

})();


// Worker Scripts
if(typeof module === 'object') (function() {
    var TEMPLATE_URL = 'client/sockets/render/sockets-window.html';

    module.exports.renderClientSocketsWindow = function(socketURLList, activeSockets, callback) {
// TODO all sockets
        var html_content =
            "<table class='sockets-window-list' style='width:100%'>" +
                "<tbody>" +
                    "<tr>" +
                        "<th>URL</th>" +
                        "<th>Status</th>" +
                        "<th>Version</th>" +
                    "</tr>";

        var activeURLs = [];
        for(var i=0; i<activeSockets.length; i++) {
            var activeSocket = activeSockets[i];
            var activeSocketURL = activeSocket.url;
            var activeMatch = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(activeSocketURL);
            var activeSocketHost = activeMatch[4];
            var activeStatus =
                ['Connecting','Open','Closing','Closed']
                [activeSocket.readyState];
            activeURLs.push(activeSocketURL);

            html_content +=
                "<tr>" +
                    "<td><a href='" + activeSocketURL + "'>" + activeSocketHost + "</a></td>" +
                    "<td class='" + activeStatus.toLowerCase() + "'>" + activeStatus + "</td>" +
                    "<td class='version'>" + activeSocket.VERSION_STRING + "</td>" +
                "</tr>";
        }

        for(i=0; i<socketURLList.length; i++) {
            var socketURL = socketURLList[i];
            var match = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/.exec(socketURL);
            var socketHost = match[4];
            if(activeURLs.indexOf(socketURL) >= 0)
                continue;

            var inactiveStatus = 'Closed'; // attemptedURLs.indexOf(socketURL) === -1 ? 'Queued' : 'Closed';

            html_content +=
                "<tr>" +
                    "<td><a href='" + socketURL + "'>" + socketHost + "</a></td>" +
                    "<td class='" + inactiveStatus.toLowerCase() + "'>" + inactiveStatus + "</td>" +
                    "<td class='version'>N/A</td>" +
                "</tr>";
        }

        html_content +=
                "</tbody>" +
            "</table>";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText
                .replace(/{\$html_content}/gi, html_content)
        );
    }
})();

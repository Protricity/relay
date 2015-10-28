/**
 * Created by ari on 10/5/2015.
 */

// Client Script
if(typeof document === 'object')
    (function() {

        // Events

        //self.addEventListener('submit', onFormEvent);
        //self.addEventListener('input', onFormEvent);
        //self.addEventListener('change', onFormEvent);

        self._geoipcallback = function(result) {
            if (result.country_name)
                result.country = result.country_name;
            if (result.region_name)
                result.region = result.region_name;
            if (result.zip_code)
                result.postal_code = result.zip_code;
            if (result.timezone)
                result.time_zone = result.timezone;

            var channelHTML = "<lh>Recent Commands</lh>";
            channelHTML += "<li><a href='#JOIN /timezone/" + result.time_zone + "'><span class='command'>Join</span> <strong>" + result.time_zone + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /country/" + result.country_code + "'><span class='command'>Join</span> <strong>" + result.country + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /region/" + result.region_code + "'><span class='command'>Join</span> <strong>" + result.region + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /city/" + result.city + "'><span class='command'>Join</span> <strong>" + result.city + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /zipcode/" + result.postal_code + "'><span class='command'>Join</span> <strong>" + result.postal_code + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /ip/" + result.ip + "'><span class='command'>Join</span> <strong>" + result.ip + "</strong></a></li>";

            document.getElementsByClassName('command-list-recent')[0].innerHTML = channelHTML;
        };

        var head = document.getElementsByTagName('head')[0];

        var newScript = document.createElement('script');
        newScript.setAttribute('async', 'async');
        newScript.setAttribute('src', self.location.protocol + '//www.telize.com/geoip?callback=_geoipcallback');
        head.appendChild(newScript);

        newScript = document.createElement('script');
        newScript.setAttribute('async', 'async');
        newScript.setAttribute('src', 'https://freegeoip.net/json/?callback=_geoipcallback');
        head.appendChild(newScript);

    })();


// Worker Scripts
if(typeof module === 'object') (function() {
    module.exports.renderNavTag = function (tagHTML, callback, Client) {
        var TEMPLATE_URL = 'client/tags/render/client-nav-tags.html';

        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if (xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);

        callback(xhr.responseText);
        return true;
    };
})();
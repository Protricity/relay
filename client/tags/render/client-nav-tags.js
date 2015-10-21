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

    })();


// Worker Scripts
if (!module) var module = {};
if (!module.exports) module.exports = {};

module.exports.renderNavTag = function(tagHTML, callback, Client) {
    var TEMPLATE_URL = 'client/tags/render/client-nav-tags.html';

    var xhr = new XMLHttpRequest();
    xhr.open("GET", TEMPLATE_URL, false);
    xhr.send();
    if(xhr.status !== 200)
        throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText);

    var done = false;
    setTimeout(function() {

        self.geoipcallback = function(result) {
            if(done)
                return;
            done = true;

            if (result.country_name)
                result.country = result.country_name;
            if (result.region_name)
                result.region = result.region_name;
            if (result.zip_code)
                result.postal_code = result.zip_code;
            if (result.timezone)
                result.time_zone = result.timezone;

            var channelHTML = "<li><a href='#JOIN /country/" + result.country_code + "'><span class='command'>Join</span> <strong>" + result.country + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /region/" + result.region_code + "'><span class='command'>Join</span> <strong>" + result.region + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /city/" + result.city + "'><span class='command'>Join</span> <strong>" + result.city + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /zipcode/" + result.postal_code + "'><span class='command'>Join</span> <strong>" + result.postal_code + "</strong></a></li>";
//                channelList.innerHTML+= "<li><a href='#JOIN /timezone/" + result.time_zone + "'><span class='command'>Join</span> <strong>" + result.time_zone + "</strong></a></li>";
            channelHTML += "<li><a href='#JOIN /ip/" + result.ip + "'><span class='command'>Join</span> <strong>" + result.ip + "</strong></a></li>";

            //channelHTML = "<div class='append'>" + channelHTML + "</div>";

            Client.appendChild('command-list-recent', channelHTML);
        };

        if(!done) importScripts('https://www.telize.com/geoip?callback=geoipcallback');
        if(!done) importScripts('https://freegeoip.net/json/?callback=geoipcallback');

    }, 100);


    return true;


    //<!--<li><a href='#JOIN ~'       ><span class='command'>Join ~</span> <span class='info'>(Your channel)</span></a></li>-->\n\

    //<script src="http://www.telize.com/geoip?callback=geoipcallback" async="async" defer="defer"></script>
    //<script src="https://freegeoip.net/json/?callback=geoipcallback" async="async" defer="defer"></script>
    //setTimeout()


};

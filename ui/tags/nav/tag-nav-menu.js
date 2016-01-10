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

            var channelValues = [
                ["/timezone/" + result.time_zone, result.time_zone],
                ["/country/" + result.country_code, result.country],
                ["/region/" + result.region_code, result.region],
                ["/city/" + result.city, result.city],
                ["/zipcode/" + result.postal_code, result.postal_code],
                ["/ip/" + result.ip, result.ip]
            ];

            var channelHTML = "<lh>Recent Commands</lh>";
            for(var i=0; i<channelValues.length; i++)
                channelHTML +=
                    "<li>" +
                        "<a href='javascript:Client.execute(\"JOIN " + channelValues[i][0] + "\");'>" +
                            "<span class='command'>Join</span> " +
                            "<strong>" +
                                channelValues[i][1] +
                            "</strong>" +
                        "</a>" +
                    "</li>";

            document.getElementsByClassName('command-list-recent')[0].innerHTML = channelHTML;
        };

        var head = document.getElementsByTagName('head')[0];

        //var newScript = document.createElement('script');
        //newScript.setAttribute('async', 'async');
        //newScript.setAttribute('src', self.location.protocol + '//www.telize.com/geoip?callback=_geoipcallback');
        //head.appendChild(newScript);

        var newScript = document.createElement('script');
        newScript.setAttribute('async', 'async');
        newScript.setAttribute('src', 'https://freegeoip.net/json/?callback=_geoipcallback');
        head.appendChild(newScript);

    })();


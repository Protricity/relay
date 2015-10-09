/**
 * Created by ari on 10/5/2015.
 */



var Tags = Tags || {};
Tags.client = Tags.client || {};
Tags.client.nav = function(tagHTML, callback) {
    var CLIENT_TEMPLATE = "\
        <nav class='navigation-commands closed'  onclick='this.classList.toggle(\"closed\");'>\n\
            <link rel='stylesheet' href='client/client.css' type='text/css'>\n\
            <header onclick1='this.parentNode.classList.toggle(\"closed\");'>\n\
                <button onclick1='this.parentNode.parentNode.parentNode.classList.toggle(\"closed\");'>&#9776;</button>\n\
                Relay <span class='hide-on-close'>Commands</span>\n\
            </header>\n\
            <ul class='command-list-channels hide-on-close'>\n\
                <lh>Channels</lh>\n\
                <li><a href='#JOIN /home'   ><span class='command'>Join /home</span></a></li>\n\
            </ul>\n\
            <ul class='command-list hide-on-close'>\n\
                <lh>Commands</lh>\n\
                <li><a href='#KEYGEN'       ><span class='command'>KeyGen</span> a new <strong>PGP Identity</strong></a></li>\n\
                <li><a href='#MANAGE'       ><span class='command'>Manage</span> your <strong>PGP Identities</strong></a></li>\n\
                <li><a href='#FEED /home/*' >View all user <span class='command'>feed</span>s</a></li>\n\
                <li><a href='#FEED ~'       >View your <span class='command'>feed</span></a></li>\n\
                <li><a href='#PUT'          ><span class='command'>Put</span> to your <strong>User Space</strong></a></li>\n\
            </ul>\n\
        </nav>";
    callback(CLIENT_TEMPLATE);

    //throw new Error("TODO");

//    self.geoipcallback = function(result) {
//        if (result.country_name)
//            result.country = result.country_name;
//        if (result.region_name)
//            result.region = result.region_name;
//        if (result.zip_code)
//            result.postal_code = result.zip_code;
//        if (result.timezone)
//            result.time_zone = result.timezone;
////                console.log(result);
//        var channelList = document.getElementsByClassName('command-list-channels')[0];
//        channelList.innerHTML += "<li><a href='#JOIN /country/" + result.country_code + "'><span class='command'>Join</span> <strong>" + result.country + "</strong></a></li>";
//        channelList.innerHTML += "<li><a href='#JOIN /region/" + result.region_code + "'><span class='command'>Join</span> <strong>" + result.region + "</strong></a></li>";
//        channelList.innerHTML += "<li><a href='#JOIN /city/" + result.city + "'><span class='command'>Join</span> <strong>" + result.city + "</strong></a></li>";
//        channelList.innerHTML += "<li><a href='#JOIN /zipcode/" + result.postal_code + "'><span class='command'>Join</span> <strong>" + result.postal_code + "</strong></a></li>";
////                channelList.innerHTML+= "<li><a href='#JOIN /timezone/" + result.time_zone + "'><span class='command'>Join</span> <strong>" + result.time_zone + "</strong></a></li>";
//        channelList.innerHTML += "<li><a href='#JOIN /ip/" + result.ip + "'><span class='command'>Join</span> <strong>" + result.ip + "</strong></a></li>";
//
//        self.geoipcallback = function (result) {}
//    };
//


    //<!--<li><a href='#JOIN ~'       ><span class='command'>Join ~</span> <span class='info'>(Your channel)</span></a></li>-->\n\

    //<script src="http://www.telize.com/geoip?callback=geoipcallback" async="async" defer="defer"></script>
    //<script src="https://freegeoip.net/json/?callback=geoipcallback" async="async" defer="defer"></script>
    //importScripts()
    //setTimeout()


    };

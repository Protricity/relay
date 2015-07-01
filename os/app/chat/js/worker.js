/**
 * Created by ari on 6/19/2015.
 */



var DEFAULT_CHANNEL_SETTINGS = '/os/app/chat/channels/default.ch';

function getServerPath(withPath) {
    var doc = typeof document !== 'undefined' ? document : this;
    var loc = doc.location.href;
    var i = loc.indexOf("/os/app/chat/");
    var serverPath = (i > 0) ? loc.substr(0, i) : doc.location.host || doc.location.hostname;
    if(serverPath[serverPath.length-1] !== '/')
        serverPath = serverPath + '/';
    if(withPath) {
        if(withPath[0] === '/')
            withPath = withPath.substr(1);
        return serverPath + withPath;
    }
    return serverPath;
}

function HttpGET(url, async)
{
    var THIS = this || {};
    THIS.onSuccess = function(settings) { console.info("Unhandled Settings: ", settings); };
    THIS.onError = function(error) {  console.info("Unhandled Settings Error: ", error); };
    THIS.exec = function() {
        if (XMLHttpRequest) { // code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest();
        }
        else { // code for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange=function()
        {
            if (xmlhttp.readyState==4)
            {
                if(xmlhttp.status==200)
                    return THIS.onSuccess(xmlhttp.responseText);
                THIS.onError();
            }
        };
        xmlhttp.open("GET", url, async || false);
        xmlhttp.send();
    };
}

function SettingsLoader(filePath, oldSettings) {
    var THIS = this || {};
    THIS.onSettings = function(settings) { console.info("Unhandled Settings: ", settings); };
    var GET = new HttpGET(filePath, false);
    THIS.onError = GET.onError;
    GET.onSuccess = function (content) {
        var settings = parseSettings(content, oldSettings || {});
        if(typeof settings.include !== 'undefined') {
            var includes = settings.include;
            delete settings.include;
            for(var i=0; i<includes.length; i++) {
                var IncludeSettings = new SettingsLoader(getServerPath(includes[i]), settings);
                IncludeSettings.onSettings = function(includeSettings) {
                    settings = includeSettings;
                };
                IncludeSettings.exec();
            }
        }

        THIS.onSettings(settings);
    };
    THIS.exec = function() { GET.exec(); }
}

function parseSettings(content, oldSettings) {
    var settings = oldSettings || {};
    var lines = content.split('\n');
    for(var i = 0; i < lines.length; i+=2) {
        var line = lines[i];
        var args = line.split(/\s+/);
        var name = args[0].toLowerCase();
        var value = args.join(" ");
        switch(name) {
            case 'include':
            case 'server':
                if(typeof settings[name] === 'undefined')
                    settings[name] = [];
                settings[name].push(args[1]);
                break;

            default:
                args.shift();
                settings[name] = args.join(" ");
                break;
        }
    }
    return settings;
}

function SocketServer(serverPath) {
    var THIS = this || {};
    THIS.onConnect = function() { console.log("Unhandled Server connect: ", arguments); };
    THIS.onError = function(err) { console.log("Unhandled Server error: ", err); };
    THIS.onMessage = function(message) { console.log("Unhandled Server message: ", message); };
    THIS.sendMessage = function(message) { console.log("Unhandled Server send message: ", message); };
    return THIS;
}

function joinChannel(path) {
    var ChannelSettings = new SettingsLoader(getServerPath(path));
    ChannelSettings.onSettings = function(settings) {
        console.log("Settings loaded for: " + path, settings);
        //var useServer = function(xhr) {
        //    console.log(xhr);
        //};
        //for(var i=0; i<settings.server.length; i++) {
        //    if(path[0] === '/') path = path.substr(1);
        //    var serverPath = settings.server[i] + path;
        //
        //    if (XMLHttpRequest) xmlhttp=new XMLHttpRequest();
        //    else                xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        //    xmlhttp.onreadystatechange=useServer;
        //    xmlhttp.open("GET", serverPath, true);
        //    xmlhttp.send();
        //}
    };
    ChannelSettings.exec();
}

onmessage = function (e) {
    var args = e.data.split(/\s+/);
    switch(args[0].toLowerCase()) {
        case 'join':
            var path = args[1].toLowerCase();
            joinChannel(path);
            break;

        default:
            throw new Error("Unknown Command: " + args[0]);
    }
};



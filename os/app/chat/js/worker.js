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

function httpGET(url, callback, onError, async)
{
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
                return callback(xmlhttp.responseText);
            if(onError) onError();
        }
    };
    xmlhttp.open("GET", url, async || false);
    xmlhttp.send();
}


function readSettingsFile(filePath, callback) {
    var settings = {};
    httpGET(filePath, function(content) {
        var lines = content.split('\n');

        for(var i = 0; i < lines.length; i+=2){
            var line = lines[i];
            var args = line.split(/\s+/);
            var name = args[0].toLowerCase();
            var value = args.join(" ");
            switch(name) {
                case 'include':
                    readSettingsFile(getServerPath(args[1]), function(includeSettings) {
                        var newSettings = {};
                        for (var attrname in settings)
                            if(settings.hasOwnProperty(attrname))
                                newSettings[attrname] = settings[attrname];
                        for (var attrname2 in includeSettings)
                            if(includeSettings.hasOwnProperty(attrname2))
                                newSettings[attrname2] = includeSettings[attrname2];
                        settings = newSettings;
                    });
                    break;

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

        callback(settings);
    })
}


function joinChannel(path) {
    readSettingsFile(getServerPath(path), function(settings) {
        console.log("Settings loaded for: " + path, settings);
        var useServer = function(xhr) {
            console.log(xhr);
        };
        for(var i=0; i<settings.server.length; i++) {
            if(path[0] === '/') path = path.substr(1);
            var serverPath = settings.server[i] + path;

            if (XMLHttpRequest) xmlhttp=new XMLHttpRequest();
            else                xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
            xmlhttp.onreadystatechange=useServer;
            xmlhttp.open("GET", serverPath, true);
            xmlhttp.send();
        }

    }, function(e) {
        postMessage('Error reading settings: ' + path);
    });
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



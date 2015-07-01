/**
 * Created by ari on 6/19/2015.
 */



var DEFAULT_CHANNEL_SETTINGS = '/os/app/chat/channels/default.ch';

var DOC = typeof document !== 'undefined' ? document : this;

var log = function(text) { 
    console.info(text); 
};

function getServerPath(withPath) {
    var loc = DOC.location.href;
    var i = loc.indexOf("/os/app/chat/");
    var serverPath = (i > 0) ? loc.substr(0, i) : DOC.location.host || DOC.location.hostname;
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
    THIS.onSettings = function(settings) {
        console.info("Unhandled Settings: ", settings);
    };
    var GET = new HttpGET(filePath, false);
    GET.onSuccess = onContent;
    THIS.onError = GET.onError;
    var settings = {'include':[]};
    function onContent (content) {
        settings = parseSettings(content, settings);
        if(settings.include.length > 0) {
            var include = settings.include.shift();
            var GET = new HttpGET(getServerPath(include), false);
            GET.onSuccess = onContent;
            THIS.onError = GET.onError;
            GET.exec();
        } else {
            delete settings.include;
            THIS.onSettings(settings);
        }

    };
    THIS.exec = function() { GET.exec(); }
}


function parseSettings(content, oldSettings) {
    var settings = oldSettings || {};
    var lines = content.split('\n');
    for(var i = 0; i < lines.length; i++) {
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

function onMessage(e) {
    if(typeof e === 'string') e = {data:e};

    var args = e.data.split(/\s+/);
    switch(args[0].toLowerCase()) {
        default:
            self.postMessage(e.data);
        //throw new Error("Unknown Command: " + args[0]);
    }
}


var socketServers = {};
function getServer(serverPath) {
    if(typeof socketServers[serverPath] === 'undefined') {
        socketServers[serverPath] = new WebSocket(serverPath);
        var webSocket = socketServers[serverPath];
        var anticipateList = [];
        function onServerEvent(e) {
            switch(e.type) {
                case 'message':
                    postMessage("message " + e.data);

//                     var msgEvt = customEvent('message', e.data);
//                     DOC.dispatchEvent(msgEvt);
//                     if(!msgEvt.defaultPrevented)
//                         log(e.type + ": " + webSocket.url + ' ' + e.data);

                    var args = e.data.split(/\s+/);
                    var cmd = args[0].toLowerCase();
                    for(var i=0; i<anticipateList.length; i++)
                        if(anticipateList[i][0].toLowerCase() === cmd)
                            anticipateList[i][1](e.data);
                    break;
                case 'error':
                case 'open':
                case 'close':
                    log(e.type + ": " + webSocket.url);
                    break;
                default:
                    throw new Error("Unhandled event: " + e.type);
            }
        }
        webSocket.addEventListener('message', onServerEvent);
        webSocket.addEventListener('open', onServerEvent);
        webSocket.addEventListener('close', onServerEvent);
        webSocket.addEventListener('error', onServerEvent);
        webSocket.anticipate = function(command, callback) {
            anticipateList.push([command, callback]);
        }
    }
    return socketServers[serverPath];
}

var channels = {};
function Channel(path) {
    var THIS = this || {};

    THIS.onServer = [function(server) {
        log("Connected to server: " + server.url);
        server.send('join ' + path);
    }];

    THIS.onSettings = [function(newSettings) {
        settings = newSettings;
        log("Settings loaded for: " + path, newSettings);
        var serverList = unique(settings.server);
        if(serverList.length === 0)
            throw new Error("Empty server list for: " + path);
        var chosenServer = null;
        function handleOpen(e) {
            this.removeEventListener('open', handleOpen);
            if(chosenServer) {
                log("Closing un-chosen server: " + this.url);
                this.close();
            }
            chosenServer = this;
            for(var ci=0; ci<THIS.onServer.length; ci++)
                THIS.onServer[ci](chosenServer);
        }
        for(var i=0; i<serverList.length; i++) {
            var server = getServer(serverList[i]);
            if(server.readyState === WebSocket.OPEN) {
                chosenServer = server;
                for(var ci=0; ci<THIS.onServer.length; ci++)
                    THIS.onServer[ci](chosenServer);
                break;
            }
            server.addEventListener('open', handleOpen);
        }
    }];
    THIS.onMessage = [function(message) {

    }];
    var settings = {};
    var ChannelSettings = new SettingsLoader(getServerPath(path) + '/default.ch');
    ChannelSettings.onSettings = function(settings) {
        for(var si=0; si<THIS.onSettings.length; si++)
            THIS.onSettings[si](settings);
    };
    ChannelSettings.onError = function() {
        log("Using Defaults for: " + path, settings);
        var ChannelSettings = new SettingsLoader(DEFAULT_CHANNEL_SETTINGS);
        ChannelSettings.onSettings = function(settings) {
            for(var si=0; si<THIS.onSettings.length; si++)
                THIS.onSettings[si](settings);
        };
        ChannelSettings.exec();
    };
    ChannelSettings.exec();

}

function joinChannel(path) {
    if(typeof channels[path] === 'undefined') {
        channels[path] = new Channel(path);
        var channel = channels[path];

    }
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


function customEvent(name, data) {
    var evt;
    if(typeof CustomEvent !== 'undefined') {
        evt = new CustomEvent(name,
            {
                detail:data,
                //bubbles: true,
                cancelable: true
            });
        evt.data = data;
        return evt;
    }
    if(DOC.createEventObject) {
        evt = DOC.createEventObject('Event');
        evt.eventType = name;
        evt.data = data;
        return evt;
    }
    evt = DOC.createEvent('Event');
    evt.initEvent(name, true, true, data);
    evt.data = data || {};
    return evt;
}

function unique(arr) {
    var u = {}, a = [];
    for(var i = 0, l = arr.length; i < l; ++i){
        if(!u.hasOwnProperty(arr[i])) {
            a.push(arr[i]);
            u[arr[i]] = 1;
        }
    }
    return a;
}
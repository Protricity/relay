var defaultSocketList = [
       'ws://relay.co.il:8080/relay-server/socket'
    //'ws://localhost:8080/relay-server/socket'
];

var socketListByPath = {};
//socketListByPath['/private/channel/'] = ['ws://domain:port/path/to/socket'];

var socketListPublic = null;
// socketListPublic = ['ws://domain:port/path/to/socket'];

var socketListPrivate = null;
// socketListPublic = ['ws://domain:port/path/to/socket'];

var publicKey = "-----BEGIN PGP PUBLIC KEY BLOCK-----\n"
    +"Version: BCPG C# v1.6.1.0\n"
    +"\n"
    +"mQENBFWZ6r0BCACakVSmgG6NaFlTbJxxdJMQHIDC16e2ospVoVkFunTiD7uQ+da3\n"
    +"5Y5Ewjv5skMcVkmAilWxtDQWwdgb+mv9SqpT3FmDEp7pPtDl/1tMZQyTQfjQ3+YC\n"
    +"a/6tAGx7p3Abi/7UXkz/3Yh3x+Oin71EHlE0mhqIgbwh8UQOP+q6+CH0SYeCPPir\n"
    +"t5+gsSSoME4ZMMxLE9osTGpYwsOE6Y4iO9oeqjAuOglWqMeRWIaUH4Om8N1IVhJF\n"
    +"oSMzTby91x0OaEePDtTHW/h6rD4ZAZoj20dxutApYHo29lVUhEY2gLrdptgw8E5I\n"
    +"SSJj8fIhZiO6o2ZLkqcCmJqd6BwoaZW+FWKPABEBAAG0EWd1ZXN0QHJlbGF5LmNv\n"
    +"LmlsiQEcBBABAgAGBQJVmeq9AAoJEFeCpFUFcZCa7G8IAIsfFF4RwEah2JIM1+VB\n"
    +"GOBilAvTcEyOhOn93Rfih2I9UMYWhAflvwi0FtAkZ4ysY1j7F4frnQ4E/6f9sNjm\n"
    +"5wMPwiEPaoSTFcEKVDNHV3qcGjCcyXtpKYY0afm3GZK8Rcc5IouDC4tHMYbmVAav\n"
    +"7YsfSRMoCw1c+6FWoE2S3A0v6uKLiq9Yux+FC36X+eXlkzp+nqCSjZ3AOC/zDPHv\n"
    +"HtZIfS7yaKJeMKdA31q4c5h0Ts3t8ojW7K/Q/v5s1LlqxM3zDx/5KsO657AKcgmv\n"
    +"1EOWmy8OyRH7M7FXN3bcU34g0hHhNWdD+n0ew0COydgj5ZMzulY5Su1hrG0UNasX\n"
    +"/Bw=\n"
    +"=E+6i\n"
    +"-----END PGP PUBLIC KEY BLOCK-----";

var privateKey = "-----BEGIN PGP PRIVATE KEY BLOCK-----\n"
    +"Version: BCPG C# v1.6.1.0\n"
    +"\n"
    +"lQOsBFWZ6r0BCACakVSmgG6NaFlTbJxxdJMQHIDC16e2ospVoVkFunTiD7uQ+da3\n"
    +"5Y5Ewjv5skMcVkmAilWxtDQWwdgb+mv9SqpT3FmDEp7pPtDl/1tMZQyTQfjQ3+YC\n"
    +"a/6tAGx7p3Abi/7UXkz/3Yh3x+Oin71EHlE0mhqIgbwh8UQOP+q6+CH0SYeCPPir\n"
    +"t5+gsSSoME4ZMMxLE9osTGpYwsOE6Y4iO9oeqjAuOglWqMeRWIaUH4Om8N1IVhJF\n"
    +"oSMzTby91x0OaEePDtTHW/h6rD4ZAZoj20dxutApYHo29lVUhEY2gLrdptgw8E5I\n"
    +"SSJj8fIhZiO6o2ZLkqcCmJqd6BwoaZW+FWKPABEBAAH/AwMCBYUa+SMv6JRgGmPv\n"
    +"vfMkGAqkkqohqoauEpMjbbU8AIWws2EqN5oihkJ5ucjhwzOgRuNmYK8XS/lDg5yU\n"
    +"OXuCWs0SA6lLrFaVAAnS4VzcOsTD6pLuD4uoBuKTHHO1D/RdYIHzDq1kYoZg+ZpY\n"
    +"J1UWXkg6Vkqt95Eq1KAdhxAdg5vibI1sFzYwStSC1jEIN0xpKAhxUAH9ZpkBiG/M\n"
    +"khRcedMtmtodF2O+E30L0OXBKa4ufL8h8umxAR3OQnWrPpGQlwBVGMjrJ4Vosmo9\n"
    +"ku4SmUzgzatQkphC7vrt6znFDG/Xd1SXmMxO7Qz0NCieqn5Thf0CfWNoiPdUm/Gg\n"
    +"1YvVLjp7b2Naa6752ObaTQ+73INbODBKF07EoNvkAqQcsz56U9JbCnI5rUJ2H+/6\n"
    +"Xl6pawdDaF4BmeBv+o+KSvztb6756DYDMQFc6fgVA2TZzZlqv9FT1R7mvGTPhSlm\n"
    +"CAr5vlA/cA0aq5+98iZk7QsWzX7qgPpmiybWCJddEe8C2sn8K2TQ4lb8fggotOYt\n"
    +"GKV0LlLpWbrmM9PXXWxHy7Cd1HsGNUKQpAi2UN59evjCzhQg5BJwgPL4FfQ/KlP7\n"
    +"9v+B+kUnm+hUU9C5NpBBIYOGB7hsg/+syeorOOWMeSPf1UWBhJa1nSWQ/lkaZk0c\n"
    +"psaOvJV1p8wrJvGLXnpNC9a7Yb3cb1aC5LUzs2vIQWWRgPvJCCJTLa0yLat/Ce0N\n"
    +"rG5KVQM0X6oIm0SNwoseqKqBu5qTBQ3NOZudyAp/gmcePnqT4Vno9+ydh6AnSyTH\n"
    +"jbz6au+QImCByJv+i6VHBEcAhOUAXZqPfw530i5/+vENmaql9FGuVSaP7M8TXX3N\n"
    +"82764PXsV5RnWpN3S82ZU5ED5mjLAmL+w/lUbB0tT7QRZ3Vlc3RAcmVsYXkuY28u\n"
    +"aWyJARwEEAECAAYFAlWZ6r0ACgkQV4KkVQVxkJrsbwgAix8UXhHARqHYkgzX5UEY\n"
    +"4GKUC9NwTI6E6f3dF+KHYj1QxhaEB+W/CLQW0CRnjKxjWPsXh+udDgT/p/2w2Obn\n"
    +"Aw/CIQ9qhJMVwQpUM0dXepwaMJzJe2kphjRp+bcZkrxFxzkii4MLi0cxhuZUBq/t\n"
    +"ix9JEygLDVz7oVagTZLcDS/q4ouKr1i7H4ULfpf55eWTOn6eoJKNncA4L/MM8e8e\n"
    +"1kh9LvJool4wp0DfWrhzmHROze3yiNbsr9D+/mzUuWrEzfMPH/kqw7rnsApyCa/U\n"
    +"Q5abLw7JEfszsVc3dtxTfiDSEeE1Z0P6fR7DQI7J2CPlkzO6VjlK7WGsbRQ1qxf8\n"
    +"HA==\n"
    +"=wSGd\n"
    +"-----END PGP PRIVATE KEY BLOCK-----";



// Socket Commands

self.infoCommand = sendWithFastestSocket;
self.infoResponse = routeResponseToClient;

// Chat Commands

self.joinCommand =
self.leaveCommand =
self.messageCommand =
self.msgCommand =
function(commandString) {
    importScripts('../cmd/chat/chat-worker.js');
    executeCommand(commandString);
};


// Post Commands

self.postCommand =
    function(commandString) {
        importScripts('../cmd/post/post-worker.js');
        executeCommand(commandString);
    };



// PGP Commands

self.keygenCommand =
self.encryptCommand =
self.registerCommand =
function(commandString) {
    importScripts('../cmd/pgp/pgp-worker.js');
    executeCommand(commandString);
};


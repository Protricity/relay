/**
 * Created by ari on 9/22/2015.
 */

if(typeof module === 'object') (function() {

    module.exports.initBetaHTTPCommands = function (HTTPServer) {

        console.log("Loaded " + __filename);
        // HTTPServer.addCommand(postRegisterCommand);
    };

    module.exports.initBetaSocketCommands = function (SocketServer) {

        // HTTP GET Command
        SocketServer.addCommand(betaSubscribeSocket);
        console.log("Loaded " + __filename);

    }
})();

function betaSubscribeSocket(requestString, client) {
    var match = /^beta\.subscribe\s+(\S+@\S+)?\s*(.*)$/i.exec(requestString);
    if (!match)         // If unmatched,
        return false;   // Pass control to next handler

    var email = match[1];
    var name = match[2];
    if(!email) {
        client.send("error Subscription Unsuccessful. Email missing");
        return true;
    }


    var qs = require('querystring');
    var fs = require('fs');
    var readline = require('readline');

    var dataFile = __dirname + '/.emails.txt';


    fs.exists(dataFile, function (exists) {
        if(exists)
        {
            var lineReader = readline.createInterface({
                input: fs.createReadStream(dataFile)
            });

            var found = false;
            var emailLC = email.toLowerCase();

            lineReader.on('line', function (line) {

                if(line.toLowerCase().indexOf(emailLC) === 0) {
                    found = true;
                    client.send("info Found duplicate email: " + email);
                }
            });

            lineReader.on('close', function() {
                if(found) {
                    client.send("error Subscription Unsuccessful. Email already subscribed");
                    return true;
                }
                appendEntry(email, name);
            });

        }else
        {
            fs.writeFile(dataFile, '', {flag: 'wx'}, function (err, data)
            {
                console.log("Created " + dataFile);
                appendEntry(email, name);
            })
        }
    });

    function appendEntry(email, name) {
        console.log("Writing " + email + (name ? " (" + name + ")" : ""));
        fs.appendFile(dataFile, email + (name ? " " + name : "") + "\n", function (err) {
            if (err)
                client.send("error " + err);
            else
                client.send("log Subscription Successful");
        });
    }

    return true;
}

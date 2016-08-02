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

    var dataFile = './beta/.emails.txt';

    var fd = fs.openSync(dataFile, 'w');


    fs.writeFile(dataFile, '', { flag: 'wx' }, function (err) {
        if (err) throw err;
        console.log("It's saved!");
    });

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

        console.log("Writing " + email + (name ? " (" + name + ")" : ""));
        try {
            fs.appendFile(dataFile, email + (name ? " " + name : "") + "\n", function (err) {
                if (err)
                    client.send("error " + err);
                else
                    client.send("log Subscription Successful");
            });
        } catch (err) {
            client.send("error " + err);
        }
    });

    return true;
}

function send(client, message) {
    if(client.readyState === client.OPEN) {
        client.send(message);
        console.info("O " + message);

    } else {
        console.warn("C " + message);
    }
}
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
        client.send("error Subscription Unsuccessful. Invalid Email Address");
        client.send("event:beta.subscription.error Invalid Email Address");
        return true;
    }

    var filePath = __dirname + '/.emails.txt';

    touch(filePath, function() {
        var found = false;
        var emailLC = email.toLowerCase();
        readLines(filePath, function(line) {
            if(line) {
                if(line.toLowerCase().indexOf(emailLC) === 0) {
                    found = true;
                    client.send("info Found duplicate email: " + email);
                }

            } else {
                if(found) {
                    console.info("Already Subscribed " + email + (name ? " (" + name + ")" : ""));
                    client.send("error Subscription Unsuccessful. Email already subscribed");
                    client.send("event:beta.subscription.error Email already subscribed");

                } else {
                    console.log("Writing " + email + (name ? " (" + name + ")" : ""));
                    var fs = require('fs');
                    fs.appendFile(filePath, email + (name ? " " + name : "") + "\n", function (err) {
                        if (err) {
                            client.send("error " + err);

                        } else {
                            client.send("info Subscription Successful");
                            client.send("event:beta.subscription.success Email Subscribed Successfully." +
                                "<br/> You will be notified when the beta launches. " +
                                "<br/> Thanks!");
                        }
                    });
                }
            }
        })
    });

    return true;
}


function touch(filePath, callback) {

    var fs = require('fs');
    fs.exists(filePath, function (exists) {
        if(exists) {
            callback();

        } else {
            fs.writeFile(filePath, '', {flag: 'wx'}, function (err, data)
            {
                console.log("Created " + filePath);
                callback();
            })
        }
    });
}

function readLines(filePath, callback) {

    var fs = require('fs');
    var readline = require('readline');

    var lineReader = readline.createInterface({
        input: fs.createReadStream(filePath)
    });

    lineReader.on('line', function (line) {
        callback(line);
    });

    lineReader.on('close', function() {
        callback();
    });
}
/**
 * Created by ari on 9/21/2015.
 */
var ws = require("nodejs-websocket");

// Scream server example: "hi" -> "HI!!!"
var server = ws.createServer(function (conn) {
    console.log("New connection");
    conn.on("text", function (str) {
        console.log("Received "+str);
        conn.sendText(str.toUpperCase()+"!!!")
    });
    conn.on("close", function (code, reason) {
        console.log("Connection closed")
    });
}).listen(8080);
console.log("Started Server");
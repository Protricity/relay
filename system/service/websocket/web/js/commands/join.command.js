/**
 * Created by ari on 7/2/2015.
 */


function joinCommand(commandString) {
    var args = commandString.split(/\s+/);
    if(args.length <= 1 || !args[1])
        throw new Error("Invalid join path");

    var path = args[1].toLowerCase();
    var socketList = defaultSocketList;
    if(typeof socketListByPath[path.toLowerCase()] === 'object')
        socketList = socketListByPath[path.toLowerCase()];
    console.log("Joining: " + path, "Socket List: ", socketList);
    selectFastestSocket(function(selectedSocket) {
        console.log("Posting Message to " + selectedSocket.url + ": " + commandString);
        selectedSocket.send(commandString);

    }, socketList);
}
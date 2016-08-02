/**
 * Created by ari.
 */
if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSPutCommands = function (SocketServer) {
        require('./keyspace/ks-server-put-keyspace-commands.js')
            .initSocketServerKSPutKeySpaceCommands(SocketServer);
        console.log("Loaded " + __filename);
    };
    module.exports.initHTTPServerKSGetCommands = function (SocketServer) {
        require('./keyspace/ks-server-put-keyspace-commands.js')
            .initHTTPServerKSPutKeySpaceCommands(SocketServer);
        console.log("Loaded " + __filename);
    };
})();
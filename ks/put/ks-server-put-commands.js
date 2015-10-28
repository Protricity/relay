/**
 * Created by ari.
 */
if(typeof module === 'object') {
    module.exports.initSocketServerKSPutCommands = function (SocketServer) {
        require('./keyspace/ks-server-put-keyspace-commands.js')
            .initSocketServerKSPutKeySpaceCommands(SocketServer);
    };
    module.exports.initHTTPServerKSGetCommands = function (SocketServer) {
        require('./keyspace/ks-server-put-keyspace-commands.js')
            .initHTTPServerKSPutKeySpaceCommands(SocketServer);
    };
}
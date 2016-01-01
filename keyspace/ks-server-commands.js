/**
 * Created by ari on 9/22/2015.
 */

if(typeof module === 'object') (function() {
    module.exports.initSocketServerKSCommands = function (SocketServer) {

        // HTTP GET Command
        SocketServer.addCommand(importGETCommand);
        function importGETCommand(commandString, e) {
            if (!/^(?:keyspace\.)?(get|http)/i.test(commandString))
                return false;
            SocketServer.removeCommand(importGETCommand);
            require('./get/ks-server-get-commands.js')
                .initSocketServerKSGetCommands(SocketServer);
            return false;
        }


        // HTTP PUT Command
        SocketServer.addCommand(importPUTCommand);
        function importPUTCommand(commandString, e) {
            if (!/^(?:keyspace\.)?put/i.test(commandString))
                return false;
            SocketServer.removeCommand(importPUTCommand);
            require('./put/ks-server-put-commands.js')
                .initSocketServerKSPutCommands(SocketServer);
            return false;
        }


        // KEYSPACE.SUBSCRIBE Command
        // KEYSPACE.AUTH Command
        SocketServer.addCommand(importSubscriptionCommand);
        function importSubscriptionCommand(commandString, e) {
            if (!/^(?:keyspaces?\.)?((un|re)?subscribe|auth)/i.test(commandString))
                return false;
            SocketServer.removeCommand(importSubscriptionCommand);
            require('./subscribe/ks-server-subscribe-commands.js')
                .initSocketServerKSSubscribeCommands(SocketServer);
            return false;
        }


        // KEYSPACE.STATUS Command
        SocketServer.addCommand(importStatusCommand);
        function importStatusCommand(commandString, e) {
            if (!/^keyspace\.status/i.test(commandString))
                return false;
            SocketServer.removeCommand(importStatusCommand);
            require('./status/ks-server-status-commands.js')
                .initSocketServerKSStatusCommands(SocketServer);
            return false;
        }

        // KEYSPACE.Scan Command
        SocketServer.addCommand(importScanCommand);
        function importScanCommand(commandString, e) {
            if (!/^keyspace\.scan/i.test(commandString))
                return false;
            SocketServer.removeCommand(importScanCommand);
            require('./scan/ks-server-scan-commands.js')
                .initSocketServerKSScanCommands(SocketServer);
            return false;
        }

        //
        //// TODO: Search here
        //// UI.CONTACTS Command
        //SocketServer.addCommand(importContactsCommand);
        //function importContactsCommand(commandString, e) {
        //    if (!/^(?:keyspace\.)?contacts/i.test(commandString))
        //        return false;
        //    SocketServer.removeCommand(importContactsCommand);
        //    require('./contacts/ks-server-contacts-commands.js')
        //        .initSocketServerContactsCommands(SocketServer);
        //    return false;
        //}

    };

    module.exports.initHTTPServerKSCommands = function (HTTPServer) {

        // HTTP GET Command
        HTTPServer.addCommand(importGETCommand);
        function importGETCommand(commandString, e) {
            if (!/^(get|http)/i.test(commandString))
                return false;
            HTTPServer.removeCommand(importGETCommand);
            require('./get/ks-server-get-commands.js')
                .initHTTPServerKSGetCommands(HTTPServer);
            return false;
        }


        //// HTTP PUT Command
        //HTTPServer.addCommand(importPUTCommand);
        //function importPUTCommand(commandString, e) {
        //    if(!/^put/i.test(commandString))
        //        return false;
        //    HTTPServer.removeCommand(importPUTCommand);
        //    require('keyspace/put/ks-server-put-commands.js')
        //        .initHTTPServerKSPutCommands(HTTPServer);
        //    return false;
        //}

    };
})();
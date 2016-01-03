/**
 * Created by ari on 12/17/2015.
 */

// Enable Strict mode
"use strict";

// Declare export module, if not found
if (!module) var module = {exports: {}};

// Declare self as a variable if it doesn't already exist
if (typeof self === 'undefined')
    var self = this;

// Export ClientSubscriptions Class. Define it if it hasn't
module.exports.ClientPassPhrases =
    typeof self.ClientPassPhrases !== 'undefined' ? self.ClientPassPhrases :

(function() {

    function ClientPassPhrases() {

    }

    var passphraseRequests = [];
    ClientPassPhrases.requestDecryptedPrivateKey = function(pgp_id_public, passphrase, callback) {
        callback = callback || function(err, privateKeyBlock){
            if (err)
                throw new Error(err);
        };

        self.module = {exports: self.exports = {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        // Query user private key for signing
        var path = 'http://' + pgp_id_public + '.ks/.private/id';
        KeySpaceDB.queryOne(path, function (err, privateKeyBlock) {
            if (err)
                return callback(err);
            if (!privateKeyBlock)
                return callback("User Private key not found: " + pgp_id_public);

            self.module = {exports: self.exports = {}};
            importScripts('pgp/lib/openpgpjs/openpgp.js');
            var openpgp = self.module.exports;

            var privateKey = openpgp.key.readArmored(privateKeyBlock.content).keys[0];

            console.log(privateKey);

            if(privateKey.primaryKey.isDecrypted)
                return callback(null, privateKey);

            if(typeof passphraseRequests[pgp_id_public] === 'undefined')
                passphraseRequests[pgp_id_public] = [];

            if (passphrase) {
                privateKey.primaryKey.decrypt(passphrase);
                if(privateKey.primaryKey.isDecrypted) {
                    var callbacks = passphraseRequests[pgp_id_public];
                    for(var i=0; i<callbacks.length; i++)
                        callbacks[i](null, privateKey);
                    delete passphraseRequests[pgp_id_public];

                    Client.execute("KEYSPACE.PASSPHRASE.SUCCESS " + pgp_id_public);

                    return callback(null, privateKey);
                }
            }

            passphraseRequests[pgp_id_public].push(callback);
            Client.execute("KEYSPACE.PASSPHRASE " + pgp_id_public);
        });

    };

    return ClientPassPhrases;
})();
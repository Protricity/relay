/**
 * Created by ari on 7/2/2015.
 */
"use strict";
if (!module) var module = {exports: {}};
if (typeof self === 'undefined')
    var self = this;
module.exports.ChannelDB =
    typeof self.ChannelDB !== 'undefined' ? self.ChannelDB :

(function() {
    // Config Database
    function ChannelDB(dbReadyCallback) {
        return ChannelDB.getDBInstance(dbReadyCallback);
    }
    self.ChannelDB = ChannelDB;

    ChannelDB.DB_PGP_KEY_LENGTH         = 8;

    ChannelDB.DB_VERSION                = 1;
    ChannelDB.DB_NAME                   = 'channel';
    ChannelDB.DB_TABLE_SUBSCRIPTIONS    = 'subscriptions';
    ChannelDB.DB_TABLE_LOGS             = 'logs';

    // TODO: local vs other users?
    ChannelDB.DB_FIELD_CHANNEL          = 'channel';
    //ChannelDB.DB_FIELD_PGP_ID_PUBLIC    = 'pgp_id_public'; // Channels talk to KeySpace
    ChannelDB.DB_FIELD_MODE             = 'mode'; // TODO: modes? not types?
    ChannelDB.DB_FIELD_NICK             = 'nick';

    if(typeof indexedDB === 'undefined')
        var mongodb     = require('mongodb'),
            MongoClient = mongodb.MongoClient;


    var dbInst = null;
    var onDBCallbacks = [];
    var connecting = false;
    ChannelDB.getDBInstance = function(callback) {
        if(dbInst)
            return callback(null, dbInst);
        if(callback)
            onDBCallbacks.push(callback);
        if(connecting)
            return;
        connecting = true;

        // First Time
        if (typeof indexedDB !== 'undefined') {
            //console.info("indexedDB.open(", ChannelDB.DB_NAME, ChannelDB.DB_VERSION, ")");
            var openRequest = indexedDB.open(ChannelDB.DB_NAME, ChannelDB.DB_VERSION);

            openRequest.onsuccess = function (e) {
                dbInst = e.target.result;
                for (var i = 0; i < onDBCallbacks.length; i++)
                    onDBCallbacks[i](null, dbInst);
                onDBCallbacks = [];
            };

            openRequest.onerror = function (e) {
                var err = e.target.result;
                for (var i = 0; i < onDBCallbacks.length; i++)
                    onDBCallbacks[i](err, null);
                onDBCallbacks = [];
                dbInst = null;
                throw new Error(err);
            };

            openRequest.onupgradeneeded = function (e) {
                var upgradeDB = e.target.result;
                //var transaction = e.target.transaction;

                try {
                    var newStore = upgradeDB.createObjectStore(ChannelDB.DB_TABLE_SUBSCRIPTIONS, {
                        keyPath: [ChannelDB.DB_FIELD_CHANNEL, ChannelDB.DB_FIELD_MODE]
                    });
                    console.log('Created Table: ' + ChannelDB.DB_NAME + '.' + newStore.name);
                } catch (e) {
                    console.info(e);
                }
                var upgradeStore = upgradeDB.get(ChannelDB.DB_TABLE_SUBSCRIPTIONS);
                if(upgradeStore.indexNames.indexOf(ChannelDB.DB_FIELD_CHANNEL) === -1)
                    upgradeStore.createIndex(ChannelDB.DB_FIELD_CHANNEL, ChannelDB.DB_FIELD_CHANNEL, { unique: false });
            };

        } else if (typeof mongodb !== 'undefined') {
            var url = 'mongodb://localhost:27017/';
            console.info("MongoClient.connect(", url, ")");

            MongoClient.connect(url, function(err, db) {
                if(err) {
                    for (var j = 0; j < onDBCallbacks.length; j++)
                        onDBCallbacks[j](err, db);
                    onDBCallbacks = [];
                    dbInst = null;
                    return;
                }

                console.log("Connected: " + url);
                dbInst = db;

                var dbCollection = db.collection(ChannelDB.DB_TABLE_SUBSCRIPTIONS);
                //dbCollection.createIndex({"path", { unique: false });
                var opts = {};
                opts[ChannelDB.DB_FIELD_CHANNEL] = 1;
                opts[ChannelDB.DB_FIELD_MODE] = 1;
                dbCollection.createIndex(opts, { unique: true });
                opts = {};
                opts[ChannelDB.DB_FIELD_CHANNEL] = 1;
                dbCollection.createIndex(opts);

                for (var i = 0; i < onDBCallbacks.length; i++)
                    onDBCallbacks[i](err, db);
                onDBCallbacks = [];
            });
        }

    };

    ChannelDB.addSubscription = function(channel, mode, callback) {
        var insertData = {};
        insertData[ChannelDB.DB_FIELD_CHANNEL] = channel.toLowerCase();
        insertData[ChannelDB.DB_FIELD_MODE] = mode.toLowerCase();
        ChannelDB.update(ChannelDB.DB_TABLE_SUBSCRIPTIONS, insertData, callback);
    };

    ChannelDB.removeSubscription = function(channel, mode, callback) {
        var deleteQueryData = {};
        deleteQueryData[ChannelDB.DB_FIELD_CHANNEL] = channel.toLowerCase();
        deleteQueryData[ChannelDB.DB_FIELD_MODE] = mode.toLowerCase();
        ChannelDB.delete(ChannelDB.DB_TABLE_SUBSCRIPTIONS, deleteQueryData, callback);
    };


    ChannelDB.queryOneSubscription = function(channel, mode, callback) {
        var done = false;
        ChannelDB.queryAllSubscriptions(channel, mode, function(err, subscriptionContent) {
            if(!done) {
                done = true;
                callback(err, subscriptionContent);
            }
        })
    };

    ChannelDB.queryAllSubscriptions = function(channel, mode, callback) {

        ChannelDB(function(err, db) {
            if(err)
                return callback(err);

            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var dbStore = db
                    .transaction([ChannelDB.DB_TABLE_SUBSCRIPTIONS], "readwrite")
                    .objectStore(ChannelDB.DB_TABLE_SUBSCRIPTIONS);

                var cursor = null;
                if(channel && mode) {
                    cursor = dbStore
                        .openCursor([channel, mode]);

                } else if(channel) {
                    cursor = dbStore
                        .index(ChannelDB.DB_FIELD_CHANNEL)
                        .openCursor(IDBKeyRange.only(channel));

                } else {
                    throw new Error("Invalid Subscription search");
                }

                cursor.onsuccess = function (e) {
                    //console.log(e, e.target.result, queryRange, pathIndex);
                    var cursor = e.target.result;
                    if (cursor) {
                        if(callback(null, cursor.value, cursor) !== true)
                            cursor.continue();

                    } else {
                        callback(null, null, cursor);
                    }
                };
                cursor.onerror = function(err) {
                    callback(err, null, cursor);
                }

            } else if (typeof mongodb !== 'undefined' && db instanceof mongodb.Db) {
                var dbCollection = db.collection(ChannelDB.DB_TABLE_HTTP_CONTENT);

                var queryFields = {};
                if(channel && mode) {
                    queryFields[ChannelDB.DB_FIELD_CHANNEL] = channel;
                    queryFields[ChannelDB.DB_FIELD_MODE] = mode;

                } else if(channel) {
                    queryFields[ChannelDB.DB_FIELD_CHANNEL] = channel;

                } else {
                    throw new Error("Invalid Subscription search");
                }
                dbCollection
                    .find(queryFields)
                    .each(callback);

            } else {
                throw new Error("Invalid Database Driver");

            }
        });
    };

    function dbUpdate(type, tableName, commandData, callback) {
        ChannelDB(function(err, db) {
            if(err)
                return callback(err);

            if(typeof IDBDatabase !== 'undefined' && db instanceof IDBDatabase) {
                var objectStore = db
                    .transaction([tableName], "readwrite")
                    .objectStore(tableName);

                switch(type) {
                    case 'insert':
                        var insertRequest = objectStore.add(commandData);
                        insertRequest.onsuccess = callback;
                        insertRequest.onerror = callback;
                        break;
                    case 'update':
                        var updateRequest = objectStore.put(commandData);
                        updateRequest.onsuccess = callback;
                        updateRequest.onerror = callback;
                        break;
                    case 'delete':
                        var deleteRequest = objectStore.delete(commandData);
                        deleteRequest.onsuccess = callback;
                        deleteRequest.onerror = callback;
                        break;
                    default:
                        throw new Error("Invalid Update Type: " + type);
                }

            } else if (typeof mongodb !== 'undefined' && db instanceof mongodb.Db) {
                var dbCollection = db.collection(tableName);
                dbCollection.insert(commandData);

                switch(type) {
                    case 'insert':
                        dbCollection.insert(commandData);
                        break;
                    case 'update':
                        dbCollection.update(commandData);
                        break;
                    case 'delete':
                        dbCollection.delete(commandData);
                        break;
                    default:
                        throw new Error("Invalid Update Type: " + type);
                }
                callback(null, commandData);

            } else {
                throw new Error("Invalid Database Driver");
            }
        });
    }

    ChannelDB.insert = function(tableName, insertData, callback) {
        callback = callback || function(err, newInsertData) {
                if(err)
                    throw err;
                console.log(tableName + ": Insert Successful", newInsertData);
            };
        dbUpdate('insert', tableName, insertData, callback);
    };

    ChannelDB.update = function(tableName, updateData, callback) {
        callback = callback || function(err, newUpdateData) {
                if(err)
                    throw err;
                console.log(tableName + ": Update Successful", newUpdateData);
            };
        dbUpdate('update', tableName, updateData, callback);
    };

    ChannelDB.delete = function(tableName, deleteData, callback) {
        callback = callback || function(err, newDeleteData) {
                if(err)
                    throw err;
                console.log(tableName + ": Delete Successful", newDeleteData);
            };
        dbUpdate('delete', tableName, deleteData, callback);
    };


    return ChannelDB;
})();

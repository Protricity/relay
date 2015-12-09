/**
 * Created by ari on 7/2/2015.
 */
"use strict";
if (!module) var module = {exports: {}};
module.exports.SettingsDB = SettingsDB;


SettingsDB.DB_VERSION               = 1;
SettingsDB.DB_NAME                  = 'settings';
SettingsDB.DB_TABLE_CLIENT          = 'client';

//SettingsDB.DB_INDEX_NAME            = 'name';

// Config Database
function SettingsDB(dbReadyCallback) {
    return SettingsDB.getDBInstance(dbReadyCallback);
}

(function() {

    var dbInst = null;
    var onDBCallbacks = [];
    var connecting = false;
    SettingsDB.getDBInstance = function(callback) {
        if(dbInst)
            return callback(null, dbInst);
        if(callback)
            onDBCallbacks.push(callback);
        if(connecting)
            return;
        connecting = true;

        //console.info("indexedDB.open(", SettingsDB.DB_NAME, SettingsDB.DB_VERSION, ")");
        var openRequest = indexedDB.open(SettingsDB.DB_NAME, SettingsDB.DB_VERSION);

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
            throw new Error(err);
        };

        openRequest.onupgradeneeded = function (e) {
            var upgradeDB = e.target.result;
            var transaction = e.target.transaction;

            if(!upgradeDB.objectStoreNames.contains(SettingsDB.DB_TABLE_CLIENT)) {
                var contentStore = upgradeDB.createObjectStore(SettingsDB.DB_TABLE_CLIENT, { keyPath: "name" });

                console.log('Upgraded Table: ' + SettingsDB.DB_NAME + '.' + contentStore.name);
            }
        };
    };


    SettingsDB.getSettings = function(settingsName, callback) {
        var done = false;
        SettingsDB.getAllSettings(settingsName, function(content) {
            if(!done) {
                done = true;
                callback(content);
            }
        })
    };

    SettingsDB.getAllSettings = function (settingsName, callback) {
        SettingsDB(function(err, db) {
            if(err)
                throw new Error(err);

            var dbStore = db
                .transaction([SettingsDB.DB_TABLE_CLIENT], "readonly")
                .objectStore(SettingsDB.DB_TABLE_CLIENT);
//             console.log(settingsName);

            if(settingsName[settingsName.length-1] === '*') {
                var queryLowBound = settingsName.substr(0, settingsName.length-2);
                var queryHighBound = queryLowBound + '\uffff';
                var queryRange = IDBKeyRange.bound(queryLowBound, queryHighBound, true, true);
                var cursorRequest = dbStore.openCursor(queryRange);
                cursorRequest.onsuccess = function (e) {

                    var cursor = e.target.result;
                    if (cursor) {
                        var settingsData = cursor.value || {name: settingsName};
                        if(callback(settingsData, cursor) !== true)
                            cursor.continue();

                    } else {
                        callback(null, cursor);
                    }
                };
                cursorRequest.onerror = function(err) {
                    throw new Error(e.target.result);
                };

            } else {

                var getRequest = dbStore.get(settingsName);
                getRequest.onsuccess = function (e) {
                    var settingsData = e.target.result || {name: settingsName};
                    callback(settingsData);
                };
                getRequest.onerror = function (e) {
                    throw new Error(e.target.result);
                };
            }

        });
    };

    SettingsDB.updateSettings = function(settingsData, callback) {
        if(typeof settingsData !== "object")
            throw new Error("Invalid Settings Data");
        if(!settingsData.name)
            throw new Error("Settings Data must include a name property");
        settingsData.name = settingsData.name.toLowerCase();

        SettingsDB(function(err, db) {
            if(err)
                return callback(err);

            var dbStore = db
                .transaction(SettingsDB.DB_TABLE_CLIENT, "readwrite")
                .objectStore(SettingsDB.DB_TABLE_CLIENT);

            var putRequest = dbStore.put(settingsData);
            putRequest.onsuccess = function(e) {
                if(callback)
                    callback(null, insertData, putRequest);

                var responseString = "SETTINGS.UPDATE " + settingsData.name;
                (typeof Client === 'object' ? Client : ClientWorker)
                    .processResponse(responseString);
            };
            putRequest.onerror = function(e) {
                if(callback)
                    callback(e.target.error, null);
            };

        });
    };


})();

/**
 * Created by ari on 7/2/2015.
 */
"use strict";

ConfigDB.DB_NAME                  = 'config';
ConfigDB.DB_TABLE_CONFIG_CLIENT   = 'client';

// Config Database
function ConfigDB(dbReadyCallback) {

    if (typeof ConfigDB.getDBRequest === 'undefined') {
        // First Time
        var openRequest = indexedDB.open(ConfigDB.DB_NAME, 2);
        var onDBCallbacks = [];
        ConfigDB.getDBRequest = function() { return openRequest; };
        ConfigDB.getCallbacks = function () { return onDBCallbacks; };
        ConfigDB.addCallback = function (callback) { onDBCallbacks.push(callback); };

        openRequest.onsuccess = function (e) {
            //console.log('DB Opened: ', openRequest.result);
            for (var i = 0; i < onDBCallbacks.length; i++)
                onDBCallbacks[i](openRequest.result);
            onDBCallbacks = [];
        };

        openRequest.onerror = function (e) {
            var err = e.currentTarget.result;
            throw new Error(err);
        };

        openRequest.onupgradeneeded = function (e) {
            var upgradeDB = e.currentTarget.result;

            if (!upgradeDB.objectStoreNames.contains(ConfigDB.DB_TABLE_CONFIG_CLIENT)) {
                console.log('Upgrading Table: ', ConfigDB.DB_TABLE_CONFIG_CLIENT);
                var clientConfigStore = upgradeDB.createObjectStore(ConfigDB.DB_TABLE_CONFIG_CLIENT, {keyPath: "id"});
            }
        };
    }

    var dbRequest = ConfigDB.getDBRequest();
    if (dbRequest.readyState === "done") {
        dbReadyCallback(dbRequest.result);
        return;
    }
    ConfigDB.addCallback(dbReadyCallback);
}

// Database Methods

ConfigDB.getConfig = function(id, callback) {
        // TODO: make virtual file in webspace
    ConfigDB(function (db) {
        var transaction = db.transaction([ConfigDB.DB_TABLE_CONFIG_CLIENT], "readonly");
        var clientConfigStore = transaction.objectStore(ConfigDB.DB_TABLE_CONFIG_CLIENT);

        var req = clientConfigStore.get(id);
        req.onsuccess = function (evt) {
            var configData = evt.target.result;
            callback(null, configData);
        };
        req.onerror = function(err) {
            callback(err, null);
        }
    });
};

ConfigDB.addConfigToDatabase = function(configData, callback, clearOldConfig) {
    if(typeof configData.id !== 'string')
        throw new Error("Invalid or missing property 'id' for config");

    function onErr(event) {
        var err = event.currentTarget.error;
        var status_content = "Error adding config to database: " + err.message;
        console.error(status_content, configData);
        if(callback)
            callback(err, null);
    }

    ConfigDB(function (db) {

        var transaction = db.transaction([ConfigDB.DB_TABLE_CONFIG_CLIENT], "readwrite");
        var clientConfigStore = transaction.objectStore(ConfigDB.DB_TABLE_CONFIG_CLIENT);

        var getRequest = clientConfigStore.get(configData.id);
        getRequest.onsuccess = function (e) {
            var oldConfigData = e.target.result;
            if(oldConfigData) {
                if(!clearOldConfig) {
                    for(var attr in oldConfigData)
                        if(oldConfigData.hasOwnProperty(attr))
                            if(typeof configData[attr] === 'undefined')
                                configData[attr] = oldConfigData[attr];

                } else {
                    console.warn("Clearing old CONFIG Data: ", oldConfigData, e);
                }
                clientConfigStore.delete(configData.id);
            }

            var insertRequest = clientConfigStore.add(configData);
            insertRequest.onsuccess = function(event) {
                console.log("Added config to database: " + configData.id, configData);
                if(callback)
                    callback(null, configData);
            };
            insertRequest.onerror = onErr;
        };
        getRequest.onerror = onErr;
    });
};


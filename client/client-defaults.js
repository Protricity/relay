if(!exports) var exports = {};
exports.ClientDefaults = ClientDefaults;

function ClientDefaults(publicKeyID, callback) {
    return ClientDefaults.load(publicKeyID, callback);
}

ClientDefaults.getDefaultConfiguration = function() {
    var config = {};
    config['path-key-public'] = '/public/id';
    config['path-key-private'] = '/.private/id';

    config['path-config-public'] = '/public/config';
    config['path-config-private'] = '/.private/config';
    // ex. data-path-config-public='public/config'

    return config;
};

ClientDefaults.loadConfig = function(publicKeyID, passphrase, callback) {
    var config = ClientDefaults.getDefaultConfiguration();
    var ksRoot = 'http://' + publicKeyID + '.ks';
    var publicConfigPath = ksRoot + config['path-config-public'];
    var privateConfigPath = ksRoot + config['path-config-private'];

    // Query local config content
    // TODO: verify signature
    // TODO: optional decrypt private config

    if(typeof KeySpaceDB === 'undefined')
        var KeySpaceDB = require('../ks/ks-db.js').KeySpaceDB;

    var configPos = 0;
    var configPaths = [
        publicConfigPath,
        privateConfigPath
    ];

    function query(configPath) {
        KeySpaceDB.queryContent(configPath, function (configData) {
            configData.content.replace(/data-([a-z-]+)=['"]([^'"])['"]/ig, function(match, name, value) {
                console.log(arguments);
                config[name] = value;
            });
            console.log(config);

            if(configPath.indexOf(ksRoot + config['path-config-public']) === -1)
                configPath.push(ksRoot + config['path-config-public']);
            if(configPath.indexOf(ksRoot + config['path-config-private']) === -1)
                configPath.push(ksRoot + config['path-config-private']);

            if(typeof configPaths[configPos] === 'string') {
                query(configPaths[configPos++]);

            } else {
                callback(config);
            }
            return true;
        });
    }
    query(configPaths[configPos++]);
};

ClientDefaults.loadRemoteConfig = function(publicKeyID, passphrase, callback) {

};

ClientDefaults.saveConfig = function(publicKeyID, passphrase) {

};
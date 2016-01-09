/**
 * Created by ari on 6/19/2015.
 */

// Worker Script
if(typeof module !== 'object')
    var module = {exports:{}};

(function() {

    module.exports.renderUILoginWindow = function(subCommand, forceRender, callback) {
        var nick_value = '';
        var status_box = '';
        var html_command_options = '';

        self.module = {exports: {}};
        importScripts('keyspace/ks-db.js');
        var KeySpaceDB = self.module.exports.KeySpaceDB;

        var privateKeys = [];

        // Query private keys.
        var path = '.private/id';
        KeySpaceDB.queryAll(path, function(err, privateKeyContentEntry) {
            if (err)
                throw new Error(err);

            if (privateKeyContentEntry) {
                var pgp_id_public = privateKeyContentEntry.pgp_id_public;
                privateKeys.push(pgp_id_public);

            } else {
                var TEMPLATE_URL = "render/ui/login/render/ui-login.html";
                if(privateKeys.length === 0) {
                    //console.info("No private keys were found for login");
                    forceRender = true;

                } else {
                    console.info("Existing Private Keys Found. Skipping Login...");
                    TEMPLATE_URL = "render/ui/login/render/ui-login-finished.html";
                    // forceRender = true;

                    ClientWorkerThread.execute("UI.CONTACTS");
                }

                if(forceRender) {


                    if(subCommand) {
                        switch(subCommand.toLowerCase()) {
                            case 'create':
                                TEMPLATE_URL = "render/ui/login/render/ui-login-finished.html";
                                break;

                            case 'import':
                                TEMPLATE_URL = "render/ui/login/render/ui-login-finished.html";
                                break;

                            case 'guest':
                                TEMPLATE_URL = "render/ui/login/render/ui-login-finished.html";
                                break;

                            case 'remote':
                                TEMPLATE_URL = "render/ui/login/render/ui-login-finished.html";
                        }
                    }

                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", TEMPLATE_URL, false);
                    xhr.send();
                    if(xhr.status !== 200)
                        throw new Error("Error: " + xhr.responseText);
                    callback(xhr.responseText
                            .replace(/{\$status_box}/gi, status_box || '')
                            .replace(/{\$nick_value}/gi, nick_value || '')
                    );
                }
            }
        });
    }

})();

//// Client Script
//if(typeof document === 'object')
//    (function() {
//        // Events
//        var contactExports = module.exports;
//
//        document.addEventListener('submit', onFormEvent, false);
//        document.addEventListener('change', onFormEvent);
//        //document.addEventListener('response:settings', onKeySpaceEvent);
////         document.addEventListener('input', onFormEvent, false);
//
//        function onFormEvent(e, formElm) {
//            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
//            if(formElm.nodeName.toLowerCase() !== 'form')
//                return false;
//
//            switch(formElm.getAttribute('name')) {
//                case 'ui-login-form':
//                    //updateCommandList(e, formElm);
//                    //contactExports.refreshUIContactList(e, formElm);
//                    if(e.type === 'submit')
//                        e.preventDefault();
//                        //contactExports.submitUIContactList(e, formElm);
//                    return true;
//
//                default:
//                    return false;
//            }
//        }
//
//
//    })();

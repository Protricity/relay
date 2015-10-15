/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object')
(function() {

    // Events

    self.addEventListener('submit', onFormEvent);
    self.addEventListener('input', onFormEvent);
    self.addEventListener('change', onFormEvent);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;
            
        switch(formElm.getAttribute('name')) {
            case 'ks-put-script-select-form':
                if(e.type === 'submit')
                    e.preventDefault();
                updatePutScriptSelectForm(e, formElm);
                return true;

            default:
                return false;
        }
    }


    var lastTemplate = null;
    function updatePutScriptSelectForm(e, formElm) {
        e.preventDefault();

        var submitElm = formElm.querySelector('[type=submit]');
        submitElm.setAttribute('disabled', 'disabled');
        var templateElm = formElm.querySelector('select[name=template]');
        var template = templateElm.value;
        if(!template)
            return;

        console.log(template, submitElm);
        submitElm.removeAttribute('disabled');

        if(!lastTemplate || lastTemplate !== template) {
            lastTemplate = template;
            //console.log("Switch Template: ", templateElm.value);

            var commandString = "PUT.SCRIPT " + template;

            var socketEvent = new CustomEvent('command', {
                detail: commandString,
                cancelable: true,
                bubbles: true
            });
            formElm.dispatchEvent(socketEvent);
        }
    }

})();

// Worker Script
else
    (function() {
        var TEMPLATE_URL = 'ks/render/put-form/ks-put-script-form.html';

        module.exports.renderPutScriptForm = function(commandString, callback) {
            var match = /^put\.script\s*([\s\S]*)$/im.exec(commandString);
            if(!match)
                throw new Error("Invalid Script Command: " + commandString);

            var scriptURL = match[1];
            var scriptPath = scriptURL.split('?')[0];
            //var args = match[2].split(/\s+/);

            var html_script_options = '';
            self.exports = {};
            self.module = {exports: {}};
            importScripts('ks/ks-content-scripts.js');
            var scripts = self.module.exports.getContentScripts();

            for(var i=0; i<scripts.length; i++) {
                var opts = scripts[i];
                var selectedHTML = '';
                if(scriptPath && scriptPath === opts[0]) {
                    selectedHTML = ' selected="selected"';
                }
                html_script_options += "<option value='" + opts[0] + "'" + selectedHTML + ">" + opts[1] + "</option>\n";
            }

            var xhr = new XMLHttpRequest();
            xhr.open("GET", TEMPLATE_URL);
            xhr.onload = function () {
                callback(xhr.responseText
                        .replace(/{\$html_script_options}/gi, html_script_options)
                );
            };
            xhr.send();
            return true;
        };
    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
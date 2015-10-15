/**
 * Created by ari on 7/2/2015.
 */
// Client Script
if(typeof document === 'object')
(function() {

    // Events

    //self.addEventListener('submit', onFormEvent);
    //self.addEventListener('input', onFormEvent);
    //self.addEventListener('change', onFormEvent);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'ks-put-choose-key-form':
                if(e.type === 'submit')
                    submitPutChooseKeyForm(e, formElm);
                return true;

            default:
                return false;
        }
    }

    function submitPutChooseKeyForm(e, formElm) {
        e.preventDefault();
    }

})();

// Worker Script
else
    (function() {

        module.exports.renderPutChooseKeyForm = function(commandString, callback) {
            var TEMPLATE_URL = 'ks/render/put-form/ks-put-choose-key-form.html';

            var xhr = new XMLHttpRequest();
            xhr.open("GET", TEMPLATE_URL);
            xhr.onload = function () {
                callback(xhr.responseText
                    //.replace(/{\$html_script_options}/gi, html_script_options)
                );
            };
            xhr.send();
            return true;
        };
    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
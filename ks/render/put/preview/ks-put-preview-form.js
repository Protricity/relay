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
            case 'ks-put-preview-form':
                if(e.type === 'submit')
                    e.preventDefault();
                updatePutPreviewSelectForm(e, formElm);
                return true;

            default:
                return false;
        }
    }
    
    function updatePutPreviewSelectForm(e, formElm) {

    }


})();


// Worker Script
else
    (function() {
        var TEMPLATE_URL = 'ks/render/put/preview/ks-put-preview-form.html';

        module.exports.renderPutPreviewForm = function(commandString, callback) {
            var match = /^put\.preview\s*([\s\S]*)$/im.exec(commandString);
            if(!match)
                throw new Error("Invalid Preview Command: " + commandString);

            var content = match[1];
            callback(content);
            return true;

            //var xhr = new XMLHttpRequest();
            //xhr.open("GET", TEMPLATE_URL);
            //xhr.onload = function () {
            //    callback(xhr.responseText
            //            .replace(/{\$content}/gi, content || '')
            //    );
            //};
            //xhr.send();
            //return true;
        };
    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
/**
 * Created by ari on 10/8/2015.
 */


// Client Script
if(typeof document === 'object')
(function() {

    document.addEventListener('submit', onFormEvent, false);
    document.addEventListener('keyup', onFormEvent, false);
    document.addEventListener('input', onFormEvent, false);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'ks-create-script-form':
                return handleCreateScriptForm(e, formElm);

            default:
                return false;
        }
    }


    function handleCreateScriptForm(e, formElm) {
        switch(e.type) {
            case 'submit':
                updatePreview(e, formElm);
                return handleSubmitEvent(e, formElm);

            case 'input':
            case 'keyup':
                updatePreview(e, formElm);
                if(e.keyCode == 13 && event.shiftKey)
                    handleSubmitEvent(e, formElm);
                return true;

            default:
                throw new Error("Unhandled: " + e.type);
        }
    }

    function handleSubmitEvent(e, formElm) {
        e.preventDefault();
        var radios = formElm.querySelectorAll('input[name=radio-step]');
        for(var i=0; i<radios.length; i++) {
            if(radios[i].checked) {
                if(i == radios.length - 1) {
                    submitForm(e, formElm);

                } else {
                    radios[i+1].checked = true;
                    var nextSection = radios[i+1].parentNode.querySelector('#' + radios[i+1].id + ' + label + .section-step');
                    var nextInput = nextSection.querySelector('input, textarea, select');
                    nextInput.focus();
                }
                return true;
            }
        }
        radios[0].checked = true;
        return true;
    }

    function submitForm(e, formElm) {
        var template_html = parseTemplateHTML(e, formElm);
        ClientSocketWorker.sendCommand('PUT.FORM ' + template_html
            .replace(/</g, '&lt;')
            .replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '')     // Remove empty html tags
        );
    }

    function updatePreview(e, formElm) {
        var template_html = parseTemplateHTML(e, formElm);

        formElm.parentNode.getElementsByClassName('put-preview-output')[0].innerHTML = template_html
            .replace(/\[\$[^}]+\]/g, '');                        // Remove empty variables

        formElm.parentNode.getElementsByClassName('put-preview-source-output')[0].innerHTML = template_html
            .replace(/<[^\/>][^>]*>\s*<\/[^>]+>/gm, '')     // Remove empty html tags
            .replace(/</g, '&lt;');

        //.replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '');     // Remove empty html tags
        formElm.parentNode.querySelector('.put-preview-section').style.display = 'block';
    }


    function parseTemplateHTML(e, formElm) {
        var templateElm = formElm.querySelector('.put-preview-source, template');
        if(!templateElm)
            throw new Error("Missing <template></template>");

        var template_html = templateElm.content.children[0].outerHTML;

        var inputElements = document.querySelectorAll('input[type=text], input[type=date], select, textarea');
        for(var i=0; i<inputElements.length; i++) {
            var name = inputElements[i].getAttribute('name');
            if(name) {
                var value = inputElements[i].value;
                template_html = template_html.replace('[$' + name + ']', value);
            }
        }
        return template_html;
    }

})();

// Worker Script
else
(function() {
    var TEMPLATE_URL = "ks/scripts/create/ks-script-create-form.html";

    module.exports.runScript = function(commandString, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText);

        return true;
    };
})();
if (!module) var module = {};
if (!module.exports) module.exports = {};
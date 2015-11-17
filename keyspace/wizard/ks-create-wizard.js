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
            case 'ks-create-wizard':
                if(e.type === 'submit'
                    || (e.keyCode == 13 && event.shiftKey)) {
                    e.preventDefault();
                    handleSubmitEvent(e, formElm);
                }
                updatePreview(e, formElm);
                return true;

            default:
                return false;
        }
    }

    function handleSubmitEvent(e, formElm) {
        var template_html = parseTemplateHTML(e, formElm);
        ClientSocketWorker.sendCommand('PUT.FORM ' + template_html
            .replace(/</g, '&lt;')
            .replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '')     // Remove empty html tags
        );


        formElm.getElementsByClassName('section-status')[0].innerHTML =
            "<span class='success'>Wizard has completed successfully</span>";

        // Close Form
        var windowElm = document.getElementsByClassName('ks-create-wizard:')[0];
        windowElm.classList.add('closed');
    }

    function updatePreview(e, formElm) {
        var template_html = parseTemplateHTML(e, formElm);

        formElm.parentNode.getElementsByClassName('ks-create-wizard-preview-output:')[0].innerHTML = template_html
            .replace(/\[\$[^}]+\]/g, '');                        // Remove empty variables

        formElm.parentNode.getElementsByClassName('ks-create-wizard-source-output:')[0].innerHTML = template_html
            .replace(/<[^\/>][^>]*>\s*<\/[^>]+>/gm, '')     // Remove empty html tags
            .replace(/</g, '&lt;');

        //.replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '');     // Remove empty html tags
        //formElm.parentNode.querySelector('.put-preview-section').style.display = 'block';
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
if(typeof module === 'object') (function() {
    var TEMPLATE_URL = "keyspace/wizard/ks-create-wizard.html";

    module.exports.renderContentScript = function(commandString, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if(xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText);

        return true;
    };
})();
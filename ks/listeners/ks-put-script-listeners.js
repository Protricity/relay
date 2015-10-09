/**
 * Created by ari on 7/2/2015.
 */
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
            
            case 'ks-put-script-form':
                if(e.type === 'submit')
                    e.preventDefault();
                updatePutScriptForm(e, formElm);
                return true;

            default:
                return false;
        }
    }
    
    function updatePutScriptForm(e, formElm) {
        var commandString = formElm.querySelector('[name=command_string]').value;

        if(e.type === 'submit') {
            var inputs = formElm.querySelectorAll('input[type=text], textarea, select');
            var queryString = "";
            for(var i=0; i<inputs.length; i++) {
                var name = inputs[i].getAttribute('name') || i;
                queryString =
                    (queryString ? queryString + '&' : '?') +
                    encodeURIComponent(name) + '=' + encodeURIComponent(inputs[i].value);
            }

            var oldCommandString = commandString;
            commandString = commandString.split('?')[0] + queryString;
            console.log(commandString);
            console.log(oldCommandString);
            // TODO Add old fields

            var socketEvent = new CustomEvent('command', {
                detail: commandString,
                cancelable: true,
                bubbles: true
            });
            formElm.dispatchEvent(socketEvent);
        }
    }

    var lastTemplate = null;
    function updatePutScriptSelectForm(e, formElm) {
        e.preventDefault();

        var templateElm = formElm.querySelector('select[name=template]');
        var template = templateElm.value;
        if(!template)
            return;

        if(!lastTemplate || lastTemplate !== template) {
            lastTemplate = template;
            //console.log("Switch Template: ", templateElm.value);

            var commandString = "PUT.TEMPLATE " + template;

            var socketEvent = new CustomEvent('command', {
                detail: commandString,
                cancelable: true,
                bubbles: true
            });
            formElm.dispatchEvent(socketEvent);
        }
    }

})();

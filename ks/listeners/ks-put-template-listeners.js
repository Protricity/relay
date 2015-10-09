/**
 * Created by ari on 7/2/2015.
 */
(function() {

    // Events

    //self.addEventListener('submit', onFormEvent);
    self.addEventListener('input', onFormEvent);
    self.addEventListener('change', onFormEvent);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;
            
        switch(formElm.getAttribute('name')) {
            case 'ks-put-template-form':
                refreshPutTemplate(e, formElm);
                return true;

            default:
                return false;
        }
    }

    var lastTemplate = null;
    function refreshPutTemplate(e, formElm) {
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

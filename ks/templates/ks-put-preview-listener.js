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

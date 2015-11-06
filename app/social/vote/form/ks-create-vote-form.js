/**
 * Created by ari on 10/8/2015.
 */


// Client Script
if(typeof document === 'object') (function() {

    document.addEventListener('submit', onFormEvent, false);
    //document.addEventListener('keyup', onFormEvent, false);
    document.addEventListener('input', onFormEvent, false);

    function onFormEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'ks-create-vote-choice-form':
                console.log('wut');
                if(e.type === 'submit'
                    || (e.keyCode == 13 && event.shiftKey))
                    e.preventDefault() ||
                    submitCreateChoiceForm(e, formElm);
                return true;

            case 'ks-create-vote-form':
                if(e.type === 'submit'
                    || (e.keyCode == 13 && event.shiftKey))
                    e.preventDefault() ||
                    submitCreateForm(e, formElm);
                updateVoteChoices(e, formElm);
                updatePreview(e, formElm);
                return true;

            default:
                return false;
        }
    }


    function submitCreateChoiceForm(e, formElm) {
        var title = formElm.choice_title.value;
        if(!title)
            throw new Error("Missing Choice Title");

        var html = parseChoiceTemplateHTML(e, formElm);
        formElm.choice_title.value = '';
        formElm.choice_content.value = '';

        var createFormElm = formElm.parentNode.querySelector('form[name=ks-create-vote-form]');

        createFormElm.choices.value += "\n    " + html;

        updateVoteChoices(e, createFormElm);
        updatePreview(e, createFormElm);
    }

    function submitCreateForm(e, formElm) {
        e.preventDefault();
        var template_html = parseTemplateHTML(e, formElm);
        ClientSocketWorker.sendCommand('PUT.FORM ' + template_html
                .replace(/</g, '&lt;')
                .replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '')     // Remove empty html tags
        );

        // Close Form
        document.getElementsByClassName('ks-create-vote-window:')[0].classList.add('closed');
    }

    function updateVoteChoices(e, formElm) {
        var template_html = parseTemplateHTML(e, formElm);

        var templateElm = document.createElement('div');
        templateElm.innerHTML = template_html;

        var choiceElms = templateElm.getElementsByClassName('app-vote-choice:');
        console.log("TODO: ", choiceElms, templateElm);

        var choice_html = '<ul>';
        for(var i=0; i<choiceElms.length; i++) {
            choice_html +=
                "<li>" +
                    choiceElms[i].innerHTML +
                "</li>";
        }
        choice_html += '</ul>';

        ClientSocketWorker.handleResponse("REPLACE ks-create-vote-choices: " +
            "<section class='ks-create-vote-choices:'>" +
                choice_html +
            "</section>"
        );
    }


    function updatePreview(e, formElm) {
        var template_html = parseTemplateHTML(e, formElm);

        ClientSocketWorker.handleResponse("REPLACE ks-put-preview-output: " +
            "<section class='ks-put-preview-output:'>" +
                template_html +
            "</section>"
        );

        //formElm.parentNode.getElementsByClassName('ks-put-preview-output:')[0].innerHTML = template_html
        //    .replace(/<script([^>]*)><\/script>/gi, '')         // Remove script tags
        //;

        formElm.parentNode.getElementsByClassName('ks-put-preview-source-output:')[0].innerHTML = template_html
            .replace(/</g, '&lt;')
        ;
    }


    function parseTemplateHTML(e, formElm) {
        var templateElm = formElm.getElementsByClassName('vote-template:')[0];
        var template_html = templateElm.content.children[0].outerHTML;

        var inputElements = document.querySelectorAll('input[type=text], input[type=date], select, textarea');
        for(var i=0; i<inputElements.length; i++) {
            var name = inputElements[i].getAttribute('name');
            if(name) {
                var value = inputElements[i].value.trim();
                template_html = template_html.replace('[$' + name + ']', value);
            }
        }
        return template_html;
    }


    function parseChoiceTemplateHTML(e, formElm) {
        var templateElm = formElm.getElementsByClassName('vote-choice-template:')[0];
        var template_html = templateElm.content.children[0].outerHTML;

        var inputElements = document.querySelectorAll('input[type=text], input[type=date], select, textarea');
        for(var i=0; i<inputElements.length; i++) {
            var name = inputElements[i].getAttribute('name');
            if(name) {
                var value = inputElements[i].value.trim();
                template_html = template_html.replace('[$' + name + ']', value);
            }
        }
        return template_html;
    }

})();

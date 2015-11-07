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
                if(e.type === 'submit'
                    || (e.keyCode == 13 && event.shiftKey))
                    e.preventDefault() ||
                    submitCreateChoiceForm(e, formElm);
                return true;

            case 'ks-create-vote-wizard':
                if(e.type === 'submit'
                    || (e.keyCode == 13 && event.shiftKey))
                    e.preventDefault() ||
                    submitCreateForm(e, formElm);
                updateVoteChoices(e, formElm);
                updatePreview(e, formElm);
                return true;

            case 'ks-create-vote-remove-choice-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitRemoveChoiceForm(e, formElm);
                return true;

            case 'ks-create-vote-edit-choice-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitEditChoiceForm(e, formElm);
                return true;

            case 'ks-create-vote-edit-select-choice-form':
                if(e.type === 'submit')
                    e.preventDefault() ||
                    submitEditSelectChoiceForm(e, formElm);
                return true;

            default:
                return false;
        }
    }

    function submitRemoveChoiceForm(e, formElm) {
        var choiceID = parseInt(formElm.i.value);

        // TODO: select local to article
        var createFormElm = document.querySelector('form[name=ks-create-vote-wizard]');

        var templateElm = document.createElement('div');
        templateElm.innerHTML = createFormElm.choices.value;

        var choiceElms = templateElm.getElementsByClassName('app-vote-choice:');
        if(choiceID > choiceElms.length - 1)
            throw new Error("Invalid Choice ID");

        choiceElms[choiceID].parentNode.removeChild(choiceElms[choiceID]);
        createFormElm.choices.value = templateElm.innerHTML;

        updateVoteChoices(e, createFormElm);
        updatePreview(e, createFormElm);

        createFormElm.getElementsByClassName('section-status')[0].innerHTML =
            "<span class='success'>Choice entry removed successfully</span>";
    }

    function submitEditChoiceForm(e, editChoiceFormElm) {
        var choiceID = parseInt(editChoiceFormElm.i.value);
        console.log("TODO EDIT: ", choiceID);

        var title = editChoiceFormElm.choice_title.value;
        if(!title)
            throw new Error("Missing new choice Title");

        var createFormElm = document.querySelector('form[name=ks-create-vote-wizard]');

        var templateElm = document.createElement('div');
        templateElm.innerHTML = createFormElm.choices.value;

        var choiceElms = templateElm.getElementsByClassName('app-vote-choice:');
        if(choiceID > choiceElms.length - 1)
            throw new Error("Invalid Choice ID");

        var choice_html_template = createFormElm.getElementsByClassName('vote-choice-template:')[0].content.children[0].outerHTML;
        var html = parseTemplateHTML(choice_html_template, editChoiceFormElm);
        //editChoiceFormElm.choice_title.value = '';
        //editChoiceFormElm.choice_content.value = '';

        choiceElms[choiceID].outerHTML = html;
        createFormElm.choices.value = templateElm.innerHTML;
        createFormElm.className = 'show-step-2';

        updateVoteChoices(e, createFormElm);
        updatePreview(e, createFormElm);

        createFormElm.getElementsByClassName('section-status')[0].innerHTML =
            "<span class='success'>Choice entry updated successfully</span>";
    }



    function submitEditSelectChoiceForm(e, editSelectChoiceFormElm) {
        var choiceID = parseInt(editSelectChoiceFormElm.i.value);

        // TODO: select local to article
        var createFormElm = document.querySelector('form[name=ks-create-vote-wizard]');
        var editFormElm = createFormElm.parentNode.querySelector('form[name=ks-create-vote-edit-choice-form]');
        createFormElm.className = 'show-step-edit';

        var templateElm = document.createElement('div');
        templateElm.innerHTML = createFormElm.choices.value;

        var choiceElms = templateElm.getElementsByClassName('app-vote-choice:');
        if(choiceID > choiceElms.length - 1)
            throw new Error("Invalid Choice ID");

        var choiceElm = choiceElms[choiceID];
        var header = choiceElm.querySelector('header');

        editFormElm.i.value = editSelectChoiceFormElm.i.value;

        if(header && header.parentNode === choiceElm) {
            editFormElm.choice_title.value = header.innerHTML.trim();
            choiceElm.removeChild(header);
            if(choiceElm.children[0].nodeName.toLowerCase() === 'main')
                choiceElm = choiceElm.children[0];
            editFormElm.choice_content.value = choiceElm.innerHTML.trim();

        } else {
            editFormElm.choice_content.value = choiceElm.innerHTML.trim();
        }
    }


    function submitCreateChoiceForm(e, createChoiceFormElm) {
        var title = createChoiceFormElm.choice_title.value;
        if(!title)
            throw new Error("Missing Choice Title");

        var createFormElm = createChoiceFormElm.parentNode.querySelector('form[name=ks-create-vote-wizard]');

        var html_template = createFormElm.getElementsByClassName('vote-choice-template:')[0].content.children[0].outerHTML;
        var html = parseTemplateHTML(html_template, createChoiceFormElm);
        createChoiceFormElm.choice_title.value = '';
        createChoiceFormElm.choice_content.value = '';

        createFormElm.choices.value += "\n    " + html;

        updateVoteChoices(e, createFormElm);
        updatePreview(e, createFormElm);

        var templateElm = document.createElement('div');
        templateElm.innerHTML = createFormElm.choices.value;

        var choiceElms = templateElm.getElementsByClassName('app-vote-choice:');

        createFormElm.getElementsByClassName('section-status')[0].innerHTML =
            "<span class='success'>Choice entry added successfully (Total: " + choiceElms.length + ")</span>";
    }

    function submitCreateForm(e, createFormElm) {
        e.preventDefault();
        var html_template = createFormElm.getElementsByClassName('vote-template:')[0].content.children[0].outerHTML;
        var template_html = parseTemplateHTML(html_template, createFormElm);
        ClientSocketWorker.sendCommand('PUT.FORM ' + template_html
                .replace(/</g, '&lt;')
                .replace(/<[^\/>][^>]*>\s*<\/[^>]+>\n*/gm, '')     // Remove empty html tags
        );

        // Close Form
        var windowElm = document.getElementsByClassName('ks-create-vote-window:')[0];
        windowElm.classList.add('closed');

        createFormElm.getElementsByClassName('section-status')[0].innerHTML =
            "<span class='success'>Wizard has completed successfully</span>";
    }

    function updateVoteChoices(e, createChoiceFormElm) {
        var createFormElm = createChoiceFormElm.parentNode.querySelector('form[name=ks-create-vote-wizard]');
        //var html_choice_template = createFormElm.getElementsByClassName('vote-choice-template:')[0].content.children[0].outerHTML;
        //var template_html = parseTemplateHTML(html_choice_template, createChoiceFormElm);

        var templateElm = document.createElement('div');
        templateElm.innerHTML = createFormElm.choices.value;

        var choiceElms = templateElm.getElementsByClassName('app-vote-choice:');

        var choice_html = '';
        for(var i=0; i<choiceElms.length; i++) {
            choice_html +=
                "<li>" +
                    "<form name='ks-create-vote-remove-choice-form'>" +
                        "<button class='button-remove-choice'>Remove</button>" +
                        "<input type='hidden' name='i' value='" + i + "'/>" +
                    "</form>" +
                    "<form name='ks-create-vote-edit-select-choice-form'>" +
                        "<button class='button-edit-choice'>Edit</button>" +
                        "<input type='hidden' name='i' value='" + i + "'/>" +
                    "</form>" +
                    choiceElms[i].innerHTML +
                "</li>";
        }

        ClientSocketWorker.handleResponse("REPLACE ks-create-vote-choices: " +
            "<ul class='ks-create-vote-choices:'>" +
                choice_html +
            "</ul>"
        );
    }


    function updatePreview(e, createFormElm) {
        var html_template = createFormElm.getElementsByClassName('vote-template:')[0].content.children[0].outerHTML;
        var template_html = parseTemplateHTML(html_template, createFormElm);

        ClientSocketWorker.handleResponse("REPLACE ks-put-preview-output: " +
            "<section class='ks-put-preview-output:'>" +
                template_html +
            "</section>"
        );

        //formElm.parentNode.getElementsByClassName('ks-put-preview-output:')[0].innerHTML = template_html
        //    .replace(/<script([^>]*)><\/script>/gi, '')         // Remove script tags
        //;

        createFormElm.parentNode.getElementsByClassName('ks-put-preview-source-output:')[0].innerHTML = template_html
            .replace(/</g, '&lt;')
        ;
    }


    function parseTemplateHTML(template_html, formElm) {
        //var templateElm = formElm.getElementsByClassName('vote-template:')[0];
        //var template_html = templateElm.content.children[0].outerHTML;

        var i=0;
        while(formElm[i]) {
            var name = formElm[i].getAttribute('name');
            if(name) {
                var value = formElm[i].value.trim();
                template_html = template_html.replace('[$' + name + ']', value);
            }
            i++;
        }
        return template_html;
    }

})();

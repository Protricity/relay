/**
 * Created by ari on 10/8/2015.
 */


// Client Script
if(typeof document === 'object') (function() {

    //document.addEventListener('submit', onFormEvent, false);
    //document.addEventListener('keyup', onFormEvent, false);
    //document.addEventListener('input', onFormEvent, false);

    //document.addEventListener('submit', onFormEvent, false);
    //document.addEventListener('change', onFormEvent, false);

    //function onFormEvent(e, formElm) {
    //    if (!formElm) formElm = e.target.form ? e.target.form : e.target;
    //    if (formElm.nodeName.toLowerCase() !== 'form')
    //        return false;
    //
    //    switch (formElm.getAttribute('name')) {
    //        case 'beta-subscribe-form':
    //            var name = formElm.name.value;
    //
    //            if (e.type === 'submit') {
    //            } else if (e.type === 'change') {
    //
    //
    //            }
    //            break;
    //    }
    //}
})();

// Worker Script
if(typeof module === 'object') (function() {
    var TEMPLATE_URL = "ui/about/window/about-window.html";

    module.exports.renderAboutWindow = function (commandString, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", TEMPLATE_URL, false);
        xhr.send();
        if (xhr.status !== 200)
            throw new Error("Error: " + xhr.responseText);
        callback(xhr.responseText);

        return true;
    };
})();
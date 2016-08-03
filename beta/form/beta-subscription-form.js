/**
 * Created by ari on 10/8/2015.
 */


// Client Script
if(typeof document === 'object') (function() {

    document.addEventListener('submit', onFormEvent, false);
    document.addEventListener('event:beta.subscription.success', onServerEvent, false);
    document.addEventListener('event:beta.subscription.error', onServerEvent, false);

    function onFormEvent(e) {
        var formElm = e.target.form ? e.target.form : e.target;
        if (formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch (formElm.getAttribute('name')) {
            case 'beta-subscription-form':
                var email = formElm.email.value;
                var name = formElm.name.value;

                e.preventDefault();

                var formattedCommandString = "BETA.SUBSCRIBE " + email + (name ? " " : "") + name;
                var socketEvent = new CustomEvent('command', {
                    detail: formattedCommandString,
                    cancelable:true,
                    bubbles:true
                });
                formElm.dispatchEvent(socketEvent);
                console.log("Beta Command: " + formattedCommandString);

                break;
        }
    }

    function onServerEvent(e) {
        var message = e.detail.split(' ');
        var eventName = message.shift().toLowerCase();
        message = message.join(' ');

        var formElms = document.getElementsByName('beta-subscription-form');
        for(var i=0; i<formElms.length; i++) {
            var formElm = formElms[i];
            var messageElm = formElm.getElementsByClassName('message');
            for(var j=0; j<messageElm.length; j++)
                messageElm[j].innerHTML = message;

            switch(eventName) {
                case 'event:beta.subscription.success':
                    formElm.classList.remove('error');
                    formElm.classList.add('success');
                    console.log("Beta Registration Successful");
                    break;

                default:
                    formElm.classList.add('error');
                    formElm.classList.remove('success');

                    break;
            }
        }
    }
})();

/**
 * Created by ari on 6/19/2015.
 */

// Client Script
if(typeof document === 'object')
    (function() {

        self.addEventListener('submit', onFormEvent, false);
        //self.addEventListener('change', onFormEvent, false);
        self.addEventListener('input', onFormEvent, false);

        function onFormEvent(e, formElm) {
            if(!formElm) formElm = e.target.form ? e.target.form : e.target;
            if(formElm.nodeName.toLowerCase() !== 'form')
                return false;

            switch(formElm.getAttribute('name')) {
                case 'pgp-import-form':
                    refreshPGPImportForm(e, formElm);
                    if(e.type === 'submit')
                        submitPGPImportForm(e, formElm);
                    return true;

                default:
                    return false;
            }
        }


        function refreshPGPImportForm(e, formElm) {
            var submitElm = formElm.querySelector('input[type=submit]');
            submitElm.setAttribute('disabled', 'disabled');
            var privateKeyBlock = formElm.querySelector('textarea[name=private_key]').value;
            if(privateKeyBlock.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") >= 0) {
                submitElm.removeAttribute('disabled');
            }
        }

        function submitPGPImportForm(e, formElm) {
            e.preventDefault();
            var privateKeyBlock = formElm.querySelector('textarea[name=private_key]').value;

            if(privateKeyBlock.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----") === -1)
                throw new Error("PGP PRIVATE KEY BLOCK not found");

            var commandString = "PGP.IMPORT " + privateKeyBlock;

            var messageEvent = new CustomEvent('command', {
                detail: commandString,
                cancelable:true
            });
            document.dispatchEvent(messageEvent);
        }

    })();

// Worker Script
else
    (function() {
        module.exports.renderPGPImportForm = function (private_key_block, status_box, callback) {
            var TEMPLATE_URL = "pgp/import/render/pgp-import-form.html";

            var EXAMPLE_PUBLIC_KEY =
                "Example: \n\n"
                + "-----BEGIN PGP PUBLIC KEY BLOCK-----\n"
                + "Version: pgpwnt v3.0a\n"
                + "Comment: pgpwned by pgpwnt\n"
                + "\n"
                + "mQENBFWZ6r0BCACakVSmgG6NaFlTbJxxdJMQHIDC16e2ospVoVkFunTiD7uQ+da3\n"
                + "5Y5Ewjv5skMcVkmAilWxtDQWwdgb+mv9SqpT3FmDEp7pPtDl/1tMZQyTQfjQ3+YC\n"
                + "a/6tAGx7p3Abi/7UXkz/3Yh3x+Oin71EHlE0mhqIgbwh8UQOP+q6+CH0SYeCPPir\n"
                + "t5+gsSSoME4ZMMxLE9osTGpYwsOE6Y4iO9oeqjAuOglWqMeRWIaUH4Om8N1IVhJF\n"
                + "oSMzTby91x0OaEePDtTHW/h6rD4ZAZoj20dxutApYHo29lVUhEY2gLrdptgw8E5I\n"
                + "SSJj8fIhZiO6o2ZLkqcCmJqd6BwoaZW+FWKPABEBAAG0EWd1ZXN0QHJlbGF5LmNv\n"
                + "LmlsiQEcBBABAgAGBQJVmeq9AAoJEFeCpFUFcZCa7G8IAIsfFF4RwEah2JIM1+VB\n"
                + "GOBilAvTcEyOhOn93Rfih2I9UMYWhAflvwi0FtAkZ4ysY1j7F4frnQ4E/6f9sNjm\n"
                + "5wMPwiEPaoSTFcEKVDNHV3qcGjCcyXtpKYY0afm3GZK8Rcc5IouDC4tHMYbmVAav\n"
                + "7YsfSRMoCw1c+6FWoE2S3A0v6uKLiq9Yux+FC36X+eXlkzp+nqCSjZ3AOC/zDPHv\n"
                + "HtZIfS7yaKJeMKdA31q4c5h0Ts3t8ojW7K/Q/v5s1LlqxM3zDx/5KsO657AKcgmv\n"
                + "1EOWmy8OyRH7M7FXN3bcU34g0hHhNWdD+n0ew0COydgj5ZMzulY5Su1hrG0UNasX\n"
                + "/Bw=\n"
                + "=E+6i\n"
                + "-----END PGP PUBLIC KEY BLOCK-----";

            var xhr = new XMLHttpRequest();
            xhr.open("GET", TEMPLATE_URL, false);
            xhr.send();
            if(xhr.status !== 200)
                throw new Error("Error: " + xhr.responseText);
            callback(xhr.responseText
                .replace(/{\$status_box}/gi, status_box || '')
                .replace(/{\$private_key_block}/gi, private_key_block)
                .replace(/{\$example_public_key}/gi, EXAMPLE_PUBLIC_KEY)
            );
            return true;
        };

    })();
if (!module) var module = {};
if (!module.exports) module.exports = {};
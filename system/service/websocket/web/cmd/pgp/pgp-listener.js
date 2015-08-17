/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var decryptionRequiredElms = document.getElementsByClassName('decryption-required');
    var verificationRequiredElms = document.getElementsByClassName('verification-required');
    document.addEventListener('log', function(e) {
        var htmlContainer = e.target;
        console.log("Needs decryption: ", htmlContainer, verificationRequiredElms);

        for(var i=decryptionRequiredElms.length-1; i>=0; i--) {
            var decryptionRequiredElm = decryptionRequiredElms[i];
            var htmlDecodedPGPContent = decodeURIComponent(decryptionRequiredElm.innerHTML);

            var pgpMessage = openpgp.message.readArmored(htmlDecodedPGPContent);

            (function(pgpMessage) {

                var encIDs = pgpMessage.getSigningKeyIds();
                var encFP = encIDs[0].toHex().toUpperCase();
                self.PGPDB.getPublicKeyData(encFP, function (err, pkData) {

                    var publicKey = openpgp.key.readArmored(pkData.block_public);

    //                 openpgp._worker_init = false;
                    openpgp.decryptMessage(publicKey.keys, pgpMessage)
                        .then(function(verifiedContent) {
                            console.log("DECRYPTED", verifiedContent.text, verifiedContent);
                        });
                });
            })(pgpMessage);

        }


        for(i=verificationRequiredElms.length-1; i>=0; i--) {
            (function(verificationRequiredElm) {
                var htmlDecodedSignedPGPContent = decodeURIComponent(verificationRequiredElm.innerHTML);
                var pgpSignedMessage = openpgp.cleartext.readArmored(htmlDecodedSignedPGPContent);
                verificationRequiredElm.classList.remove('verification-required');
                verificationRequiredElm.classList.add('verification-pending');

                (function(pgpSignedMessage) {
                    var signIDs = pgpSignedMessage.getSigningKeyIds();
                    var signFP = signIDs[0].toHex().toUpperCase();



                    self.PGPDB.getPublicKeyData(signFP, function (err, pkData) {

                        var publicKey = openpgp.key.readArmored(pkData.block_public);
                        var feedKeyID = publicKey.keys[0].primaryKey.getKeyId().toHex();

                        //                 openpgp._worker_init = false;
                        openpgp.verifyClearSignedMessage(publicKey.keys, pgpSignedMessage)
                            .then(function(verifiedContent) {
                                var verifiedText = verifiedContent.text;
                                for(var i=0; i<verifiedContent.signatures.length; i++)
                                    if(!verifiedContent.signatures[i].valid)
                                        throw new Error("Invalid Signature: " + verifiedContent.signatures[i].keyid.toHex().toUpperCase());

                                verificationRequiredElm.classList.add('verified');
                                verificationRequiredElm.classList.remove('verification-pending');

                                var decryptedContentElm = document.createElement('span');
                                decryptedContentElm.classList.add('pgp-verified-content');

                                decryptedContentElm.innerHTML = protectHTMLContent(verifiedText);
                                verificationRequiredElm.parentNode.insertBefore(decryptedContentElm, verificationRequiredElm);

                                console.log("VERIFIED", verificationRequiredElm, decryptedContentElm, verifiedContent.text, verifiedContent);


                                var contentEvent = new CustomEvent('pgp:verified', {
                                    bubbles: true
                                });
                                decryptedContentElm.dispatchEvent(contentEvent);


                            }).catch(function(err) {
                                console.log(err);
                            });
                    });
                })(pgpSignedMessage);

            })(verificationRequiredElms[i]);

        }



    });

    function protectHTMLContent(htmlContent) {
        var tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };

        htmlContent = htmlContent.replace(/[&<>]/g, function(tag) {
            return tagsToReplace[tag] || tag;
        });

        htmlContent = htmlContent.replace(/&lt;(a|p|span|div)(?:\s+(class|data-channel|data-timestamp)=[^=&]+\s*)*&gt;/g, function(tag) {
            tag = tag.replace('&lt;', '<');
            return tag;
        });

        htmlContent = htmlContent.replace(/&lt;\//i, '</');
        htmlContent = htmlContent.replace(/&gt;/ig, '>');
        return htmlContent;
    }

})();



(function() {
    var SCRIPT_PATH = 'cmd/pgp/lib/openpgpjs/openpgp.js';
    var head = document.getElementsByTagName('head')[0];
    if(head.querySelectorAll('script[src=' + SCRIPT_PATH.replace(/[/.]/g, '\\$&') + ']').length === 0) {
        var newScript = document.createElement('script');
        newScript.setAttribute('src', SCRIPT_PATH);
        head.appendChild(newScript);

        var timeout = setInterval(function() {
            var src = SCRIPT_PATH.replace('/openpgp.', '/openpgp.worker.');
            if(!window.openpgp || window.openpgp._worker_init)
                return;
            window.openpgp.initWorker(src);
            window.openpgp._worker_init = true;
            clearInterval(timeout);
//             console.info("OpenPGP Worker Loaded: " + src);
        }, 500);
    }
})();
/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var verifiedContentElms = document.getElementsByClassName('pgp-verified-content');
    document.addEventListener('pgp:verified', function(e) {
        var htmlContainer = e.target;
        console.log("Do something with: ", htmlContainer, verifiedContentElms);

        for(var i=verifiedContentElms.length-1; i>=0; i--) {
            var verifiedContentElm = verifiedContentElms[i];


        }


    });

})();

/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var verifiedContentElms = document.getElementsByClassName('pgp-verified-content');
    document.addEventListener('pgp:verified', function(e) {
        var htmlContainer = e.target;

        for(var i=verifiedContentElms.length-1; i>=0; i--) {
            var verifiedContentElm = verifiedContentElms[i];

            var feedPostElm = verifiedContentElm.getElementsByClassName('feed-post')[0];
            var channel = feedPostElm.getAttribute('data-channel');
            var timestamp = feedPostElm.getAttribute('data-timestamp');

            var chatMessageElm = document.createElement('span');
            chatMessageElm.innerHTML =
                '<strong>Feed Post:</strong> <a href="">' +
                    channel +
                "</a>";

            chatMessageElm.classList.add('feed-link');
            verifiedContentElm.parentNode.insertBefore(chatMessageElm, verifiedContentElm);

            //console.log("Chat replaced: ", chatMessageElm);
        }


    });

})();

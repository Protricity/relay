/**
 * Created by ari on 7/2/2015.
 */
(function() {

    var verifiedContentElms = document.getElementsByClassName('pgp-verified-content');
    var unsortedFeedPostElms = document.getElementsByClassName('feed-post-container unsorted');

    document.addEventListener('pgp:verified', function(e) {
        //var htmlContainer = e.target;

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
        }
    });


    document.addEventListener('log', function(e) {
        //var htmlContainer = e.target;

        var lastElm = null;
        while(unsortedFeedPostElms.length > 0)
            (function(unsortedFeedPostElm) {
                if(unsortedFeedPostElm === lastElm)
                    throw new Error("Duplicate sort elm");

                lastElm = unsortedFeedPostElm;
//                 console.log("Sort: ", unsortedFeedPostElm);

                var newTimeStamp = parseInt(unsortedFeedPostElm.getElementsByClassName('feed-post')[0].getAttribute('data-timestamp'));

                var parent = unsortedFeedPostElm.parentNode;
                var children = parent.getElementsByClassName('feed-post sorted');
                for(var j=0; j<children.length; j++) {
                    var child = children[i];
                    var existingTimeStamp = parseInt(child.getElementsByClassName('feed-post')[0].getAttribute('data-timestamp'));

                    if(existingTimeStamp > newTimeStamp) {
                        parent.insertBefore(unsortedFeedPostElm, child);
                        unsortedFeedPostElm.classList.remove('unsorted');
                        unsortedFeedPostElm.classList.add('sorted');
                        return;
                    }
                }

                unsortedFeedPostElm.classList.remove('unsorted');
                unsortedFeedPostElm.classList.add('sorted');

            })(unsortedFeedPostElms[0]);
    });

})();

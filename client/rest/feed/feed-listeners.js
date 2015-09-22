/**
 * Created by ari on 7/2/2015.
 */
(function() {

    //var verifiedContentElms = document.getElementsByClassName('pgp-verified-content1');

    document.addEventListener('log', sortFeedEntry);
    document.addEventListener('submit', onSubmitEvent);

    var unsortedElms = document.getElementsByClassName('feed-unsorted');
    function sortFeedEntry(e) {
        if(unsortedElms.length === 0)
            return;

        var feedEntry = unsortedElms[0];
        feedEntry.classList.remove('feed-unsorted');
        feedEntry.classList.add('feed-sorting');

        sortFeedEntry(e);

        var children = feedEntry.parentNode.children;
        var newTimeStamp = parseInt(feedEntry.querySelector('article[data-timestamp]').getAttribute('data-timestamp'));

        for(var i=0; i<children.length; i++) {
            var child = children[i];
            if(!child.classList.contains('feed-sorted'))
                continue;
            var existingTimeStamp = parseInt(child.querySelector('article[data-timestamp]').getAttribute('data-timestamp'));

            if(existingTimeStamp < newTimeStamp) {
                feedEntry.parentNode.insertBefore(feedEntry, child);
                feedEntry.classList.remove('feed-sorting');
                feedEntry.classList.add('feed-sorted');
                return;
            }
        }

        // Insert last
        feedEntry.parentNode.appendChild(feedEntry);
        feedEntry.classList.remove('feed-sorting');
        feedEntry.classList.add('feed-sorted');
    }

    function onSubmitEvent(e, formElm) {
        if(!formElm) formElm = e.target.form ? e.target.form : e.target;
        if(formElm.nodeName.toLowerCase() !== 'form')
            return false;

        switch(formElm.getAttribute('name')) {
            case 'feed-like-form':
                e.preventDefault();
                findParentNode(e.target, 'article').classList.toggle('like');
                return true;

            case 'feed-comments-form':
                e.preventDefault();
                findParentNode(e.target, 'article').classList.toggle('show-comments');
                refreshComments(e);
                return true;

            case 'feed-share-form':
                e.preventDefault();
                return true;

            case 'feed-source-form':
                e.preventDefault();
                findParentNode(e.target, 'article').classList.toggle('show-source');
                return true;

            default:
                return false;
        }

    }

    function refreshComments(e) {
        var article = findParentNode(e.target, 'article');
        if(!article.classList.contains('show-comments'))
            return false;
        var uid = article.getAttribute('data-uid');

        var commentsSection = article.getElementsByClassName('feed-comments-section')[0];
        console.log("Refresh comments: ", uid, commentsSection);
    }

    function findParentNode(target, parentNodeName) {
        parentNodeName = parentNodeName.toLowerCase();
        while(target = target.parentNode)
            if(target.nodeName.toLowerCase() === parentNodeName)
                return target;

        throw new Error("Could not find parent: " + parentNodeName);
    }

})();

//document.addEventListener('pgp:verified', function(e) {
//    //var htmlContainer = e.target;
//
//    for(var i=verifiedContentElms.length-1; i>=0; i--) {
//        var verifiedContentElm = verifiedContentElms[i];
//
//        var feedPostElm = verifiedContentElm.getElementsByClassName('feed-post')[0];
//        var channel = feedPostElm.getAttribute('data-path');
//        var timestamp = feedPostElm.getAttribute('data-timestamp');
//
//        var chatMessageElm = document.createElement('span');
//        chatMessageElm.innerHTML =
//            '<strong>Feed Post:</strong> <a href="">' +
//            channel +
//            "</a>";
//
//        chatMessageElm.classList.add('feed-link');
//        verifiedContentElm.parentNode.insertBefore(chatMessageElm, verifiedContentElm);
//    }
//});
//

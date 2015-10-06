/**
 * Created by ari on 8/31/2015.
 */

(function() {

    //document.addEventListener('render', onLog);
    //document.addEventListener('render.replace', onLogReplace);

    //var sortedChannelElms = document.getElementsByClassName('channel sorted');
    //var unsortedChannelElms = document.getElementsByClassName('channel unsorted');
    function onLogReplace(e) {
        //if(e.target.classList.contains('channel')) {
        //    var channelElm = e.target;
        //    if(!channelElm.classList.contains('sorted')) {
        //        if(!channelElm.classList.contains('unsorted')) {
        //            channelElm.classList.add('unsorted');
        //            sortChannels();
        //        }
        //    }
        //}
    }

    function sortChannels() {
        for(var i=unsortedChannelElms.length-1; i>=0; i--) {
            (function (unsortedChannelElm) {
                var sortValue = unsortedChannelElm.getAttribute('data-sort');
                if(!sortValue) {
                    console.info("Could not sort ", unsortedChannelElm);
                    unsortedChannelElm.classList.add('sorted');
                    unsortedChannelElm.classList.add('nosort');
                    unsortedChannelElm.classList.remove('unsorted');
                    return;
                }
                var parentElm = unsortedChannelElm.parentNode;
                var channelElms = parentElm.getElementsByClassName('channel');
                var sortedChannels = [];
                for(var i=0; i<channelElms.length; i++) {
                    var channelElm = channelElms[i];
                    if(channelElm === unsortedChannelElm) {

                    } else if(channelElm.parentNode !== parentElm) {
                        console.warn("Channel within channel: ", channelElm);

                    } else {
                        if(unsortedChannelElm.getAttribute('data-sort') > channelElm.getAttribute('data-sort')) {
                            sortedChannels.push(channelElm);
                        }
                    }
                }

                for(i=0; i<sortedChannels.length; i++) {

                }
            })(unsortedChannelElms[i]);
        }
    }

    function compareChannels(elm1, elm2) {
        return elm1.getAttribute('data-sort') - elm2.getAttribute('data-sort');
    }

})();
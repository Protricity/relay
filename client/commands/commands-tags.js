/**
 * Created by ari on 9/16/2015.
 */




tagCallbacks['websocket'] = function(tagString, callback) {
    var found = false;
    if(!found) {
        console.warn("Could not find content for tag: " + tagString);
        callback("<span class='error'>Tag content not found</span>");
    }
};

/**
 * Created by ari on 10/6/2015.
 */

var Templates = Templates || {};
Templates.client = Templates.client || {};
Templates.client.render = function(renderElement, themeName, callback) {
    switch(renderElement.toLowerCase()) {
        case 'body':
            return renderBody(callback);
        default:
            throw new Error("Unknown Render Element: " + renderElement);
    }
};

function renderBody(callback) {

}
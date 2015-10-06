/**
 * Created by ari on 10/6/2015.
 */

var Templates = Templates || {};
Templates.app = Templates.app || {};
Templates.app.themes = Templates.app.themes || {};
Templates.app.themes.minimal = function(renderElement, callback) {
    switch(renderElement.toLowerCase()) {
        case 'body':
            return renderBody(callback);
        default:
            throw new Error("Unknown Render Element: " + renderElement);
    }
};

function renderBody(callback) {

}
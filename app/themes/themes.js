/**
 * Created by ari on 10/6/2015.
 */

(function() {

    Client.addTheme('minimal', function(renderElement, callback) {
        importScripts('app/themes/minimal/minimal-theme.js');
        Templates.app.themes.minimal(renderElement, callback);
        delete Templates.app.themes.minimal;
    })
})();
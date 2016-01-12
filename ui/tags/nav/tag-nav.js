/**
 * Created by ari on 10/5/2015.
 */

// Worker Scripts
if(typeof module === 'object') (function() {
    module.exports.renderNavTag = function (tagHTML, callback) {
        var match = /^\{nav(?::([^} ]+))?}$/i.exec(tagHTML);
        if (!match)
            throw new Error("Invalid Nav Tag: " + tagHTML);

        var subTag = (match[1] || '').toLowerCase();
        var TEMPLATE_URL;
        switch(subTag) {
            case "":
            case "menu":
                return renderNavMenuTag(tagHTML, callback);
                break;

            default:
                throw new Error("Unknown subtag: " + tagHTML);
        }
    };

    var renderNavMenuTag =
    module.exports.renderNavMenuTag = function (tagHTML, callback) {


        self.module = {exports: {}};
        importScripts('ui/menu/ui-client-menu-commands.js');
        self.module.exports.getMenu(menuCommand, 
            function(menu) {
                
                var html_menu = '';
                
                for(var menuKey in menu) {
                    if(menu.hasOwnProperty(menuKey)) {
                        var menuItem = menu[menuKey];
                        if(!Array.isArray(menuItem))
                            menuItem = [menuItem];
                            
                        // TODO: Section
                            
                        html_menu += 
                          "<li>" + 
                              "<a href='javascript:Client.execute(\"UI.MENU " + menuKey + "\");'>" + 
                                  menuItem[0] + 
                              "</a>" +
                          "</li>"
                                
                    }
                }
                
                var TEMPLATE_URL = 'ui/tags/nav/tag-nav-menu.html';
                var xhr = new XMLHttpRequest();
                xhr.open("GET", TEMPLATE_URL, false);
                xhr.send();
                if (xhr.status !== 200)
                    throw new Error("Error: " + xhr.responseText);
        
                var html_menu = '';
        
                callback(
                    xhr.responseText
                        .replace(/{\$html_menu}/gi, html_menu)
                );
            }
        );

        return true;
    };

})();
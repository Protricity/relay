/**
 * Created by ari on 10/5/2015.
 */



var Templates = Templates || {};
Templates.client = Templates.client || {};
Templates.client.template = Templates.client.template || {};
Templates.client.template.base = function(theme, callback) {
    var CLIENT_TEMPLATE = "\
    <body class='template-minimal'>\n\
        <nav class='navigation-commands closed'>\n\
            <header onclick='toggleNavigationCommandMenu(event)'>\n\
                <label>\n\
                    <button onclick='toggleNavigationCommandMenu(event)'>&#9776;</button>\n\
                Relay <span class='hide-on-close'>Commands</span>\n\
                </label>\n\
            </header>\n\
            <ul class='command-list-channels hide-on-close'>\n\
                <lh>Channels</lh>\n\
                <!--<li><a href='#JOIN ~'       ><span class='command'>Join ~</span> <span class='info'>(Your channel)</span></a></li>-->\n\
                <li><a href='#JOIN /home'   ><span class='command'>Join /home</span></a></li>\n\
            </ul>\n\
            <ul class='command-list-identity hide-on-close'>\n\
                <lh>Commands</lh>\n\
                <li><a href='#KEYGEN'       ><span class='command'>KeyGen</span> a new <strong>PGP Identity</strong></a></li>\n\
                <li><a href='#MANAGE'       ><span class='command'>Manage</span> your <strong>PGP Identities</strong></a></li>\n\
                <li><a href='#FEED /home/*' >View all user <span class='command'>feed</span>s</a></li>\n\
                <li><a href='#FEED ~'       >View your <span class='command'>feed</span></a></li>\n\
                <li><a href='#PUT'          ><span class='command'>Put</span> to your <strong>User Space</strong></a></li>\n\
            </ul>\n\
        </nav>\n\
        <span class='channel-container'>\n\
        </span>\n\
    </body>";

    callback(CLIENT_TEMPLATE
            //.replace(/{\$content}/gi, content || '')
        //        .replace(/{\$html_pgp_id_public}/gi, html_pgp_id_public_html || '')
        //.replace(/{\$form_class}/gi, form_classes.join(' '))
        //.replace(/{\$html_path_options}/gi, html_path_options || '')
        //.replace(/{\$attr_preview_checked}/gi, "checked='checked'") // TODO: get from config
    );
};

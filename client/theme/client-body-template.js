/**
 * Created by ari on 10/5/2015.
 */



var Templates = Templates || {};
Templates.client = Templates.client || {};
Templates.client.body = function(theme, callback) {
    var CLIENT_TEMPLATE = "\
    <article>\n\
        <link rel='stylesheet' href='client/client.css' type='text/css'>\n\
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
        <section class='channel-container'></section>\n\
    </article>";

    callback(CLIENT_TEMPLATE);
};

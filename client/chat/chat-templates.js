/**
 * Created by ari on 6/19/2015.
 */


var templateChatChannel = function(channelPath, callback) {
    var CHANNEL_TEMPLATE = "\
        <article class='channel chat chat:{$channel_path}'>\n\
            <script src='chat/chat-listeners.js'></script>\n\
            <link rel='stylesheet' href='chat/chat.css' type='text/css'>\n\
            <legend><span class='command'>Join</span> {$channel}</legend>\n\
            <div class='title-commands'>\n\
                <a class='title-command-minimize' href='#MINIMIZE chat:{$channel_path}'>[-]</a><!--\n\
             --><a class='title-command-maximize' href='#MAXIMIZE chat:{$channel_path}'>[+]</a><!--\n\
             --><a class='title-command-close' href='#CLOSE chat:{$channel_path}'>[x]</a>\n\
            </div>\
            <form name='chat-form'>\n\
                <table>\n\
                    <tbody>\n\
                        <tr>\n\
                            <td style='vertical-align: top'>\n\
                                <select multiple='multiple' name='user-list' size='5'>\n\
                                    <optgroup class='chat-active-users:{$channel_path}' label='Active Users (0)'></optgroup>\n\
                                    <optgroup class='chat-inactive-users:{$channel_path}' label='Inactive Users (0)'></optgroup>\n\
                                </select>\n\
                            </td>\n\
                            <td style='vertical-align: top'>\n\
                                <fieldset class='chat-log:{$channel_path}'>Joining {$channel}...</fieldset>\n\
                            </td>\n\
                        </tr>\n\
                        <tr>\n\
                            <td colspan='2'>\n\
                                <input name='message' type='text' class='reset focus' placeholder='Send a message to {$channel}. [hit enter]' />\n\
                                <input type='submit' value='Send' name='submit-send-chat' />\n\
                                <input type='hidden' value='{$channel}' name='channel' />\n\
                            </td>\n\
                        </tr>\n\
                    </tbody>\n\
                </table>\n\
            </form>\n\
        </article>";


    // Callback
    callback(CHANNEL_TEMPLATE
        .replace(/{\$channel_path}/gi, channelPath.toLowerCase())
        .replace(/{\$channel}/gi, channelPath)
    );
};


var templateChatChannelMessage = function(commandResponse, callback) {
    var match = /^(chat)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/im.exec(commandResponse);
    if (!match)
        throw new Error("Invalid Chat Response: " + commandResponse);
    var channelPath = match[2];
    var timestamp = parseInt(match[3]);
    var session_uid = match[4];
    var username = match[5];
    var content = (match[6]); // fixPGPMessage

    var MESSAGE_TEMPLATE = '<div class="channel-log">' +
        '<span class="username" data-session-uid="{$session_uid}" data-timestamp="{$timestamp}">{$username}</span>' +
        ': <span class="message">{$content}</span>' +
        '</div>';

    callback(MESSAGE_TEMPLATE
            .replace(/{\$timestamp}/gi, timestamp.toString())
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$session_uid}/gi, session_uid)
            .replace(/{\$username}/gi, username)
            .replace(/{\$content}/gi, content)
    );
};

var templateChatChannelAction = function(commandResponse, callback) {
    var args = commandResponse.split(/\s/);
    var channelPath = args[1];
    var pgp_id_public = args[2];
    var session_uid = args[3];
    var username = args[4];
    var visibility = args[5];

    var actionText = '';
    switch(args[0].toLowerCase()) {
        case 'join': actionText = 'joined'; break;
        case 'leave': actionText = 'left'; break;
        default: throw new Error("Unknown action: " + commandResponse);
    }

    var ACTION_TEMPLATE = '<div class="channel-log">' +
        '<span class="username" data-session-uid="{$session_uid}">{$username}</span>' +
        ' has <span class="action">{$action}</span>' +
        ' <a href="#JOIN {$channel}" class="path">{$channel}</a>' +
        '</div>';

    callback(ACTION_TEMPLATE
            .replace(/{\$action}/gi, actionText)
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$session_uid}/gi, session_uid)
            .replace(/{\$username}/gi, username)
            .replace(/{\$visibility}/gi, visibility)
            .replace(/{\$pgp_id_public}/gi, pgp_id_public)
    );
};

var templateChatChannelNick = function (commandResponse, callback) {
    var args = commandResponse.split(/\s/);
    var channelPath = args[1];
    var old_username = args[2];
    var pgp_id_public = args[3];
    var session_uid = args[4];
    var new_username = args[5];
    var visibility = args[6];

    var NICK_TEMPLATE = '<div class="channel-log">' +
        'Username <span class="username">{$old_username}</span>' +
        ' has been <span class="action">renamed</span> to <span class="username">{$new_username}</span>' +
        '</div>';

    callback(NICK_TEMPLATE
        .replace(/{\$action}/gi, 'left')
        .replace(/{\$channel}/gi, channelPath)
        .replace(/{\$old_username}/gi, old_username)
        .replace(/{\$new_username}/gi, new_username)
    );
};


var templateUserList = function(channelPath, sigIDList, callback) {
    var CHANNEL_USERLIST_SELECT_OPTION = "<option value='{$session_uid}'>{$username}</option>";

    var CHANNEL_USERLIST_SELECT_OPTGROUP =
        "<optgroup class='chat-active-users:" + channelPath.toLowerCase() + "' label='Active Users (" + sigIDList.length + ")'>{$html_options}</optgroup>";

    var optionHTML = '';
    for(var i=0; i<sigIDList.length; i++) (function(sigid) {

        var split = sigid.split(/\s+/g);
        if(split[0].toUpperCase() !== 'IDSIG')
            throw new Error("Invalid IDSIG: " + sigid);

        var pgp_id_public = split[1];
        var session_uid = split[2];
        var username = split[3];
        var visibility = split[4];

        optionHTML += CHANNEL_USERLIST_SELECT_OPTION
            .replace(/{\$session_uid}/gi, session_uid)
            .replace(/{\$username}/gi, username)
            .replace(/{\$pgp_id_public}/gi, pgp_id_public)
            .replace(/{\$visibility}/gi, visibility);

    })(sigIDList[i]);

    callback(CHANNEL_USERLIST_SELECT_OPTGROUP
        .replace(/{\$html_options}/gi, optionHTML)
    );
};
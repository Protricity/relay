/**
 * Created by ari on 6/19/2015.
 */

var Templates = Templates || {};
Templates.chat = Templates.chat || {};
Templates.chat.form = function(channelPath, callback) {
    var CHANNEL_TEMPLATE = "\
        <article class='channel chat chat:{$channel_path}'>\n\
            <script src='app/social/chat/chat-listeners.js'></script>\n\
            <link rel='stylesheet' href='app/social/chat/chat.css' type='text/css'>\n\
            <header class='show-on-minimized'>\n\
                <span class='command'>Join</span><span> {$channel}</span>\n\
                <a class='title-command-minimize' href='#MINIMIZE chat:{$channel_path}' style='float: right'>[-]</a><!--\n\
             --><a class='title-command-maximize' href='#MAXIMIZE chat:{$channel_path}' style='float: right'>[+]</a><!--\n\
             --><a class='title-command-close' href='#CLOSE chat:{$channel_path}' style='float: right'>[x]</a>\n\
            </header>\
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
                                <fieldset class='chat-log chat-log:{$channel_path}'>Joining {$channel}...</fieldset>\n\
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


Templates.chat.message = function(commandResponse, callback) {
    var match = /^(chat)\s+(\S+)\s+(\S+)\s+(\d+)\s+([\s\S]+)$/im.exec(commandResponse);
    if (!match)
        throw new Error("Invalid Chat Response: " + commandResponse);
    var channelPath = match[2];
    var username = match[3];
    var timestamp = parseInt(match[4]);
    var content = (match[5]); // fixPGPMessage

    var MESSAGE_TEMPLATE = '<div class="chat-log-entry append">' +
        '<span class="username" data-timestamp="{$timestamp}">{$username}</span>' +
        ': <span class="message">{$content}</span>' +
        '</div>';

    callback(MESSAGE_TEMPLATE
        .replace(/{\$timestamp}/gi, timestamp+'')
        .replace(/{\$channel}/gi, channelPath)
        .replace(/{\$username}/gi, username)
        .replace(/{\$content}/gi, content),
        username
    );
};

Templates.chat.action = function(commandResponse, callback) {
    var args = commandResponse.split(/\s/);
    var channelPath = args[1];
    var username = args[2];

    var actionText = '';
    switch(args[0].toLowerCase()) {
        case 'join': actionText = 'joined'; break;
        case 'leave': actionText = 'left'; break;
        default: throw new Error("Unknown action: " + commandResponse);
    }

    var ACTION_TEMPLATE = '<div class="chat-log-entry append">' +
        '<span class="username">{$username}</span>' +
        ' has <span class="action">{$action}</span>' +
        ' <a href="#JOIN {$channel}" class="path">{$channel}</a>' +
        '</div>';

    callback(ACTION_TEMPLATE
            .replace(/{\$action}/gi, actionText)
            .replace(/{\$channel}/gi, channelPath)
            .replace(/{\$username}/gi, username)
    );
};

Templates.chat.nick = function (commandResponse, callback) {
    var args = commandResponse.split(/\s/);
    var old_username = args[1];
    var new_username = args[2];

    var NICK_TEMPLATE = '<div class="chat-log-entry append">' +
        'Username <span class="username">{$old_username}</span>' +
        ' has been <span class="action">renamed</span> to <span class="username">{$new_username}</span>' +
        '</div>';

    callback(NICK_TEMPLATE
        .replace(/{\$old_username}/gi, old_username)
        .replace(/{\$new_username}/gi, new_username)
    );
};


Templates.chat.userList = function(channelPath, userList, callback) {
    var optionHTML = "<optgroup class='chat-active-users:" + channelPath.toLowerCase() + "' label='Active Users (" + userList.length + ")'>\n";

    for (var i = 0; i < userList.length; i++) {
        var username = userList[i];
        optionHTML += "\n\t<option>" + username + "</option>"
    }
    optionHTML += "\n</optgroup>";
    callback(optionHTML);
};
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package relay.service.command;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import javax.websocket.Session;

/**
 *
 * @author ari
 */
public class ChannelCommands implements ISocketCommand {
    
    private final HashMap<String, ArrayList<Session>> mChannelUsers = new HashMap<>(); 
    private final HashMap<Session, ArrayList<String>> mUserChannels = new HashMap<>(); 
//    private final HashMap<Session, String> mUserNames = new HashMap<>();


    public String getSessionChatID(Session session) {
        PGPCommands.PGPUserInfo userInfo = PGPCommands.getStatic().getSessionPGPInfo(session);
        return userInfo.SessionUID; // userInfo.getUserName(session);
    }

    @Override
    public void onSocketOpen(Session newSession) throws Exception {
//        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }

    @Override
    public void onSocketClosed(Session oldSession) throws Exception {
        checkSession(oldSession);
    }
    
    @Override
    public boolean executeCommand(String data, Session session) throws Exception {
        String[] args = data.split("\\s+", 2);
        switch(args[0].toLowerCase()) {
            case "join":
                joinChannel(session, args[1]);
                return true;
                
            case "leave":
                leaveChannel(session, args[1]);
                return true;
                
            case "chat":
                String[] chatArgs = args[1].split("\\s+", 3);
                if(chatArgs.length == 1) 
                    throw new IllegalArgumentException("Missing path");
                chatChannel(session, chatArgs[0], Long.parseLong(chatArgs[1]), chatArgs[2]);
                return true;
                      
            case "msg":
            case "message":
                String[] messageArgs = args[1].split("\\s+", 2);
                if(messageArgs.length == 1) 
                    throw new IllegalArgumentException("Missing user");
                messageUser(session, messageArgs[0], messageArgs[1]);
                return true;
                
            default:
                return false;
        }
//        session.getBasicRemote().sendText("ECHO " + message);
    }
    
    public void joinChannel(Session userSession, String channel) throws IllegalArgumentException {
        channel = fixPath(channel);
        PGPCommands PC = PGPCommands.getStatic();
        PGPCommands.PGPUserInfo userInfo = PC.getSessionPGPInfo(userSession);
        
        ArrayList<Session> channelUsers;
        if(mChannelUsers.containsKey(channel)) {
            channelUsers = mChannelUsers.get(channel);
            if(channelUsers.contains(userSession)) {
                sendText(userSession, "ERROR User already joined channel: " + channel);
                return;
            }
        } else {
            channelUsers = new ArrayList<>();
            mChannelUsers.put(channel, channelUsers);
        }


        ArrayList<String> userChannels;
        if(mUserChannels.containsKey(userSession)) {
            userChannels = mUserChannels.get(userSession);
            if(userChannels.contains(channel)) {
                sendText(userSession, "ERROR User already joined channel: " + channel);
                return;
            }
        } else {
            userChannels = new ArrayList<>();
            mUserChannels.put(userSession, userChannels);
        }
            
        channelUsers.add(userSession);
        userChannels.add(channel);

        String userListContent = "";
        
        // Notify other users
        for(Session channelUserSession : channelUsers) {
            if(channelUserSession.isOpen()) {
                sendText(channelUserSession, "JOIN " + channel + " " + userInfo.PublicKeyID + " " + userInfo.SessionUID + " " + userInfo.UserName + " " + userInfo.Visibility);
            
                userListContent += "\n" + 
                    PC.getSessionPGPInfo(channelUserSession)
                    .IDSigFirstLine;
            }
        }
        
        // Give session the user list for this channel
        sendText(userSession, "USERLIST " + channel + userListContent);
    }

    public void leaveChannel(Session userSession, String channel) throws IllegalArgumentException {
//        channel = fixPath(channel);
        
        PGPCommands PC = PGPCommands.getStatic();
        PGPCommands.PGPUserInfo userInfo = PC.getSessionPGPInfo(userSession);
        if(!mChannelUsers.containsKey(channel))
            throw new IllegalArgumentException("Channel not found: " + channel);
        
        ArrayList<Session> channelUsers = mChannelUsers.get(channel);
        if(!channelUsers.contains(userSession))
            throw new IllegalArgumentException("User not found in channel: " + channel);

        for(Session session : channelUsers) 
            if(session.isOpen()) 
                sendText(session, "LEAVE " + channel + " " + userInfo.PublicKeyID + " " + userInfo.SessionUID + " " + userInfo.UserName);
        
        channelUsers.remove(userSession);
        ArrayList<String> userChannels = mUserChannels.get(userSession);
        userChannels.remove(channel);
    }

    public boolean hasChannel(Session userSession, String channel) {
        if(mChannelUsers.containsKey(channel)) 
            return mChannelUsers.get(channel).contains(userSession);

        return false;
    }
    
    public boolean checkSession(Session expiredSession) {
        if(expiredSession.isOpen())
            return true;
        if(mUserChannels.containsKey(expiredSession)) {
            // Leave all channels
            ArrayList<String> channelList = mUserChannels.get(expiredSession);
            String[] channels = channelList.toArray(new String[channelList.size()]);

            for(String channel: channels)
                leaveChannel(expiredSession, channel);
            
            // Remove from user record
            mUserChannels.remove(expiredSession);
        }
        return false;
    }


    public void messageUser(Session userSession, String userTarget, String message) {
        PGPCommands PC = PGPCommands.getStatic();
        PGPCommands.PGPUserInfo userInfo = PC.getSessionPGPInfo(userSession);
        
        for(Session session: userSession.getOpenSessions()) {
            if(userTarget.compareToIgnoreCase(session.getId()) == 0) {
               sendText(session, "MESSAGE " + userInfo.SessionUID + " " + userInfo.UserName + " " + message);
               return;
            }
        }
        
        sendText(userSession, "ERROR could not find user " + getSessionChatID(userSession));
    }

    public void chatChannel(Session userSession, String channel, long timestamp, String message) throws IllegalArgumentException {
        PGPCommands PC = PGPCommands.getStatic();
        PGPCommands.PGPUserInfo userInfo = PC.getSessionPGPInfo(userSession);
        
        channel = fixPath(channel);
        
        if(!hasChannel(userSession, channel))
            joinChannel(userSession, channel);

        ArrayList<Session> users;
        if(mChannelUsers.containsKey(channel)) {
            users = mChannelUsers.get(channel);
        } else {
            users = new ArrayList<>();
            mChannelUsers.put(channel, users);
        }
        
        for(Session session : users)
            if(session.isOpen()) 
               sendText(session, "CHAT " + channel + " " + timestamp + " " + userInfo.SessionUID + " " + userInfo.UserName + " " + message);

//        String[] parts = channel.replaceAll("\\/$|^\\/", "").split("\\/");
//        String wildCardPath = "*";
//        String curPath = "/";
//        for(int i=0; i<=parts.length; i++) {
//            if(mSubscriptions.containsKey(wildCardPath)) {
//                for(Session session : getChannelUsers(wildCardPath))
//                    if(session.isOpen()) 
//                       sendText(session, "CHAT " + wildCardPath + " " + getSessionChatID(userSession) + " " + message);
//            }
//            
//            if(i<parts.length) {
//                curPath = curPath + parts[i] + "/";
//                wildCardPath = curPath + "*";
//            }
//        }
    }
    
    public Collection<Session> getChannelUsers(String channel) {
        return Collections.unmodifiableCollection(
            mChannelUsers
            .get(channel));
    }
    
    public Collection<String> getUserChannels(Session userSession) {
        return Collections.unmodifiableCollection(
            mUserChannels
            .get(userSession));
    }
    
        
    private void sendText(Session session, String text) {
        try {
            System.out.println(getSessionChatID(session) + " SENDING " + text); 
            session.getBasicRemote().sendText(text);
        } catch (IOException ex) {
            ex.printStackTrace();
        }
    }
    
    public static String byteArrayToHex(byte[] a) {
        StringBuilder sb = new StringBuilder(a.length * 2);
        for(byte b: a)
           sb.append(String.format("%02x", b & 0xff));
        return sb.toString();
    }
    
    private String fixPath(String path) {
        if(!path.contains("/") && !path.contains(".") && path.charAt(0) != '#')
            path = '#' + path;
        return path;
    }
    
    
    private static ChannelCommands _inst = null;
    public static ChannelCommands getStatic() {
        if(_inst != null)
            return _inst;
        _inst = new ChannelCommands();
        return _inst;
    }
    

    public void sendIDSIG(Session userSession, String IDSIG, String oldUsername) {
        String idSigFirstLine = IDSIG.split("\n")[0];
        ArrayList<Session> sendOnce = new ArrayList<>();
        
        PGPCommands PC = PGPCommands.getStatic();
        PGPCommands.PGPUserInfo userInfo = PC.getSessionPGPInfo(userSession);

//        ArrayList<Session> removeSessions = new ArrayList<>();
        // Get all channels user is in
        for(String channel: mUserChannels.get(userSession)) {
            
            // Get all users in those channels
            for(Session channelUserSession: mChannelUsers.get(channel)) {
                if(channelUserSession.isOpen()) {
                    if(!sendOnce.contains(channelUserSession)) {
                        sendOnce.add(channelUserSession);
                        sendText(channelUserSession, idSigFirstLine);
                    }
                    sendText(channelUserSession, "NICK " + channel + " " + oldUsername + " " + userInfo.PublicKeyID + " " + userInfo.SessionUID + " " + userInfo.UserName + " " + userInfo.Visibility);

//                } else {
//                    removeSessions.add(channelUserSession);
                }
            }
        }
        
//        for(Session removeSession: removeSessions)
//            checkSession(removeSession);
                
//        sendText(userSession, idSigFirstLine);
    }
}

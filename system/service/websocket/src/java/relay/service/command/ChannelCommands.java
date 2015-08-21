/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package relay.service.command;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map.Entry;
import javax.websocket.Session;

/**
 *
 * @author ari
 */
public class ChannelCommands implements ISocketCommand {
    
    private static final HashMap<String, ArrayList<Session>> mSubscriptions = new HashMap<>(); 
    private static final HashMap<Session, String> mUserNames = new HashMap<>();

    public String getSessionChatID(Session session) {
        if(mUserNames.containsKey(session))
            return mUserNames.get(session);

        return session.getId();
    }

    @Override
    public void onSocketConnection(Session newSession) throws Exception {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
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
                
            case "msg":
            case "message":
                String[] msgArgs = args[1].split("\\s+", 2);
                if(msgArgs.length == 1) 
                    throw new Exception("Missing path");
                messageChannel(session, msgArgs[0], msgArgs[1]);
                return true;
                
            case "priv":
                String[] privArgs = args[1].split("\\s+", 2);
                if(privArgs.length == 1) 
                    throw new Exception("Missing user");
                messageUser(session, privArgs[0], privArgs[1]);
                return true;
                
            case "nick":
                setNick(session, args[1]);
                return true;
            default:
                return false;
        }
//        session.getBasicRemote().sendText("ECHO " + message);
    }
    
    public boolean joinChannel(Session userSession, String channel) {
        channel = fixPath(channel);
        
        ArrayList<Session> channelUsers = getChannelUsers(channel);
        for(Session session : channelUsers) {
            if(session == userSession) {
                return false;
            }
        }

        channelUsers.add(userSession);

        for(Session session : channelUsers) 
            if(session.isOpen()) 
                sendText(session, "JOIN " + channel + " " + getSessionChatID(userSession));

        return true;
    }

    public boolean leaveChannel(Session userSession, String channel) {
        channel = fixPath(channel);
        
        ArrayList<Session> channelUsers = getChannelUsers(channel);
        for(Session session : channelUsers) {
            if(session == userSession) {
                channelUsers.remove(session);
                return true;
            }
        }

        for(Session session : channelUsers) 
            if(session.isOpen()) 
                sendText(session, "LEAVE " + channel + " " + getSessionChatID(userSession));

        return false;
    }

    public boolean hasSubscription(Session userSession, String channel) {
        ArrayList<Session> channelUsers = getChannelUsers(channel);
        for(Session session : channelUsers) {
            if(session == userSession) {
                return true;
            }
        }

        return false;
    }

    public void messageUser(Session userSession, String userTarget, String message) {
        for(Session session: userSession.getOpenSessions()) {
            if(userTarget.compareToIgnoreCase(session.getId()) == 0) {
               sendText(session, "PRIV " + getSessionChatID(userSession) + " " + message);
               return;
            }
        }
        
        sendText(userSession, "ERROR could not find user " + getSessionChatID(userSession));
    }

    public void messageChannel(Session userSession, String channel, String message) {
        channel = fixPath(channel);
        
        if(!hasSubscription(userSession, channel))
            joinChannel(userSession, channel);

        for(Session session : getChannelUsers(channel))
            if(session.isOpen()) 
               sendText(session, "MESSAGE " + channel + " " + getSessionChatID(userSession) + " " + message);
        
        String[] parts = channel.replaceAll("\\/$|^\\/", "").split("\\/");
        String wildCardPath = "*";
        String curPath = "/";
        for(int i=0; i<=parts.length; i++) {
            if(mSubscriptions.containsKey(wildCardPath)) {
                for(Session session : getChannelUsers(wildCardPath))
                    if(session.isOpen()) 
                       sendText(session, "MESSAGE " + wildCardPath + " " + getSessionChatID(userSession) + " " + message);
            }
            
            if(i<parts.length) {
                curPath = curPath + parts[i] + "/";
                wildCardPath = curPath + "*";
            }
        }
    }
    
    public void setNick(Session userSession, String newNick) {
        String ePattern = "^[a-zA-Z0-9._-]+@?((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))?$";
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(ePattern);
        java.util.regex.Matcher m = p.matcher(newNick);
        if(!m.matches()) {
            sendText(userSession, "ERROR could not find user " + getSessionChatID(userSession));
            return;
        }
        
        String oldNick = getSessionChatID(userSession);
        if(mUserNames.containsKey(userSession)) {
            mUserNames.put(userSession, newNick);
        } else {
            mUserNames.replace(userSession, oldNick, newNick);
        }
        sendText(userSession, "NICK " + userSession.getId() + ' ' + getSessionChatID(userSession));
    }

    public ArrayList<Session> getChannelUsers(String channel) {
        if(mSubscriptions.containsKey(channel))
            return mSubscriptions.get(channel);
        ArrayList<Session> channelUsers = new ArrayList<>();
        mSubscriptions.put(channel, channelUsers);
        return channelUsers;
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
}

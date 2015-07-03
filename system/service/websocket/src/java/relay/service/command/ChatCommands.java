/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package relay.service.command;

import java.util.ArrayList;
import javax.websocket.Session;

/**
 *
 * @author ari
 */
public class ChatCommands implements ISocketCommand {
    @Override
    public boolean executeCommand(String data, Session session) {
        String[] args = data.split("\\s+", 2);
        switch(args[0].toLowerCase()) {
            case "join":
                return joinChannel(session, args[1]);
                
            case "leave":
                return leaveChannel(session, args[1]);
                
            case "msg":
            case "message":
                String[] msgArgs = args[1].split("\\s+", 2);
                return messageChannel(session, msgArgs[1], msgArgs[2]);
                
            case "identify":
                return identifyUser(session, data);
                
        return false;
//        session.getBasicRemote().sendText("ECHO " + message);
    }
    
    
    private static ArrayList<Channel> mChannels = new ArrayList<Channel>();
    public Channel getChannel(String path) {
        for(Channel channel: mChannels) 
            if(channel.path.equalsIgnoreCase(path))
                return channel;
        
        Channel newChannel = new Channel(path);
        mChannels.add(newChannel);
        return newChannel;
    }
    
    public boolean joinChannel(Session session, String path) {
        Channel channel = getChannel(path);
        return channel.join(session);
    }
    
    public boolean leaveChannel(Session session, String path) {
        Channel channel = getChannel(path);
        return channel.leave(session);
    }
    
    public boolean hasUser(Session session, String path) {
        Channel channel = getChannel(path);
        return channel.has(session);
    }
    
    public boolean messageChannel(Session session, String path, String message) {
        Channel channel = getChannel(path);
        if(!channel.has(session)) {
            
            return false;
        }
        
        channel.message(session, message);
        return true;
    }

    public boolean identifyUser(Session session, String data) {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }
    
    public class Channel
    {
        public String path;
        public ArrayList<Session> mUsers = new ArrayList<>();

        public Channel(String path) {
            this.path = path;
        }

        public boolean join(Session userSession) {
            for(Session session : mUsers) {
                if(session == userSession) {
                    return false;
                }
            }
            
            mUsers.add(userSession);
            return true;
        }

        public boolean leave(Session userSession) {
            for(Session session : mUsers) {
                if(session == userSession) {
                    mUsers.remove(session);
                    return true;
                }
            }
            
            return false;
        }

        public boolean has(Session userSession) {
            for(Session session : mUsers) {
                if(session == userSession) {
                    return true;
                }
            }
            
            return false;
        }

        public void message(Session userSession, String message) {
            Session[] empty = new Session[0];
            this.message(userSession, message, empty);
        }
        public void message(Session userSession, String message, Session[] skipUsers) {
            
            for(Session session : mUsers) {
                boolean skip = false;
                for(Session skipUser : skipUsers) {
                    if(skipUser == session) {
                        skip = true;
                        break;
                    }
                }
                if(skip) 
                    continue;
                
                session.getBasicRemote().sendText("MESSAGE " + userSession.);
            }
        }
        
    }
}

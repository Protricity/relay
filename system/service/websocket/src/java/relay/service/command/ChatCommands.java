/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package relay.service.command;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import javax.websocket.Session;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPUtil;
import org.bouncycastle.openpgp.jcajce.JcaPGPPublicKeyRingCollection;

/**
 *
 * @author ari
 */
public class ChatCommands implements ISocketCommand {
    
    private static HashMap<Session, PGPPublicKey> mIDKeys = new HashMap<>();
    private static char[] mAllowedModes = {'o'};
    private static HashMap<String, ArrayList<Session>> mSubscriptions = new HashMap<>(); 
    private static HashMap<String, String> mChannelModes = new HashMap<>(); 
    
    public String getSessionChatID(Session session) {
        if(mIDKeys.containsKey(session))
            return mIDKeys
                    .get(session)
                    .getUserIDs()
                    .next()
                    .toString();
        return session.getId();
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
                
            case "identify":
                identifyUser(session, data);
                return true;
                
            default:
                return false;
        }
//        session.getBasicRemote().sendText("ECHO " + message);
    }
    
    public void identifyUser(Session session, String data) throws PGPException, IOException {
        int sPos = data.indexOf("-----BEGIN PGP PUBLIC KEY BLOCK-----");
        int fPos = data.indexOf("-----END PGP PUBLIC KEY BLOCK-----");
        if(sPos == -1)
            throw new PGPException("No BEGIN PGP PUBLIC KEY BLOCK found");
        if(fPos == -1)
            throw new PGPException("No END PGP PUBLIC KEY BLOCK found");
        fPos += "-----END PGP PUBLIC KEY BLOCK-----".length();
        String publicKeyString = data.substring(sPos, fPos);
        InputStream in=new ByteArrayInputStream(publicKeyString.getBytes());
        in = PGPUtil.getDecoderStream(in);
        JcaPGPPublicKeyRingCollection pgpPub = new JcaPGPPublicKeyRingCollection(in);
        in.close();

        Iterator<PGPPublicKeyRing> rIt = pgpPub.getKeyRings();
        PGPPublicKeyRing kRing = rIt.next();
        Iterator<PGPPublicKey> kIt = kRing.getPublicKeys();
        PGPPublicKey key = kIt.next();
        
        if(mIDKeys.containsKey(session))
            throw new PGPException("Already identified to server");
        
        mIDKeys.put(session, key);
        
        sendText(session, "INFO User Identified: " + byteArrayToHex(key.getFingerprint()));
    }
    

    public boolean setChannelMode(String channel, String newMode) throws IllegalArgumentException {
        String oldMode = mChannelModes.containsKey(channel) ? mChannelModes.get(channel) : "";
        boolean negative = newMode.charAt(0) == '-';
        char modeValue = newMode.charAt(newMode.length()-1);
        if(!Arrays.asList(mAllowedModes).contains(modeValue))
            throw new IllegalArgumentException("Unknown mode: " + newMode);
        for(int i=0; i<oldMode.length(); i++) {
            char oldModeValue = oldMode.charAt(i);
            if(modeValue == oldModeValue) {
                if(negative) {
                    oldMode = oldMode.replace(String.valueOf(modeValue), "");
                    mChannelModes.put(channel, oldMode);
                    return true;
                } else {
                    oldMode += modeValue;
                    mChannelModes.put(channel, oldMode);
                    return true;
                }
            }
        }
        return false;
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

    public ArrayList<Session> getChannelUsers(String channel) {
        if(mSubscriptions.containsKey(channel))
            return mSubscriptions.get(channel);
        ArrayList<Session> channelUsers = new ArrayList<Session>();
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

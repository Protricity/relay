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
    
    private static ArrayList<Channel> mChannels = new ArrayList<Channel>();
    private static HashMap<Session, PGPPublicKey> mIDKeys = new HashMap<>();
    
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
    
    
    public Channel getChannel(String path) {
        for(Channel channel: mChannels) 
            if(channel.path.equalsIgnoreCase(path))
                return channel;
        
        Channel newChannel = new Channel(path);
        mChannels.add(newChannel);
        return newChannel;
    }
    
    public void joinChannel(Session session, String path) {
        Channel channel = getChannel(path);
        if(channel.join(session))
            sendText(session, "INFO joined " + path);
        else 
            sendText(session, "ERROR failed to join " + path);
    }
    
    public void leaveChannel(Session session, String path) {
        Channel channel = getChannel(path);
        if(channel.leave(session))
            sendText(session, "INFO joined " + path);
        else 
            sendText(session, "ERROR failed to leave " + path);
    }
    
    public void messageChannel(Session session, String path, String message) throws IOException {
        Channel channel = getChannel(path);
        channel.message(session, message);
    }

    public boolean hasUser(Session session, String path) {
        Channel channel = getChannel(path);
        return channel.has(session);
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
    
    
    public class Channel
    {
        public String path;
        public ArrayList<Session> mUsers = new ArrayList<>();
        public String mModes = "";
        public char[] mAllowedModes = {'o'};

        public Channel(String path) {
            this.path = path;
        }

        public boolean setMode(String newMode) throws IllegalArgumentException {
            boolean negative = newMode.charAt(0) == '-';
            char modeValue = newMode.charAt(newMode.length()-1);
            if(!Arrays.asList(mAllowedModes).contains(modeValue))
                throw new IllegalArgumentException("Unknown mode: " + newMode);
            for(int i=0; i<mModes.length(); i++) {
                char oldModeValue = mModes.charAt(i);
                if(modeValue == oldModeValue) {
                    if(negative) {
                        mModes = mModes.replace(String.valueOf(modeValue), "");
                        return true;
                    } else {
                        mModes += modeValue;
                        return true;
                    }
                }
            }
            return false;
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

        public void message(Session userSession, String message) throws IOException {
            this.message(userSession, message, new ArrayList<>());
        }
        
        public void message(Session userSession, String message, ArrayList<Session> skipUsers) {
            if(!this.has(userSession))
                this.join(userSession);

            for(Session session : mUsers) {
                if(
                        !session.isOpen() 
                        || skipUsers.contains(session)) 
                    continue;
                sendText(session, "MESSAGE " + userSession.getId() + " " + this.path + " " + message);
            }
        }
    }
    
    
        
    private void sendText(Session session, String text) {
        try {
            System.out.println(session.getId() + " SENDING " + text); 
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
}

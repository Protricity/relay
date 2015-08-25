/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package relay.service.command;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.Security;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.websocket.Session;
import org.bouncycastle.openpgp.PGPEncryptedDataList;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPObjectFactory;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPSignature;
import org.bouncycastle.openpgp.PGPSignatureList;
import org.bouncycastle.openpgp.PGPUtil;
import org.bouncycastle.openpgp.jcajce.JcaPGPPublicKeyRingCollection;
import org.bouncycastle.openpgp.operator.jcajce.JcaKeyFingerprintCalculator;
import org.bouncycastle.openpgp.operator.jcajce.JcaPGPContentVerifierBuilderProvider;

/**
 *
 * @author ari
 */
public class PGPCommands implements ISocketCommand {
    
    public class PGPUserInfo {
        public PGPUserInfo(String challengeString) {
            SessionUID = challengeString;
        }
        public String SessionUID;
        public String PublicKeyID = null;
        public String UserName = null;
        public String Visibility = "";
        public int CacheTime = 0;
        
        public String getUserName(Session session) {
            if(UserName != null)
                return UserName;
            return getSessionPGPInfo(session).SessionUID; // TODO move to chat or make generic
        }
        
    }
    
    private final HashMap<Session, PGPUserInfo> mUserInfo = new HashMap<>();
    
    private PGPCommands() {
        
    }
    
    public PGPUserInfo getSessionPGPInfo(Session session) {
        return mUserInfo.get(session);
    }
    
    @Override
    public void onSocketConnection(Session newSession) throws Exception {
        String sessionUID = newSession.getId().length() == 32
            ? getSessionPGPInfo(newSession).SessionUID
            : java.util.UUID.randomUUID().toString();
        mUserInfo.put(newSession, new PGPUserInfo(sessionUID));
        newSession.getBasicRemote().sendText("IDENTIFY " + sessionUID);

    }

    @Override
    public boolean executeCommand(String data, Session session) throws Exception {
        String[] args = data.split("\\s+", 2);
        switch(args[0].toLowerCase()) {
            case "identify":
                identifySession(session, data);
                return true;
                
            default:
                return false;
        }
//        session.getBasicRemote().sendText("ECHO " + message);
    }

    private void identifySession(Session session, String data) throws PGPException {

        PGPUserInfo userInfo = mUserInfo.get(session);
        
        PGPPublicKey publicKey = identifyPublicKeyBlock(session, data);
        String publicKeyFingerprint = byteArrayToHex(publicKey.getFingerprint()).toUpperCase();
        String publicKeyID = publicKeyFingerprint.substring(publicKeyFingerprint.length() - 16);
        ArrayList<String> verifiedContentList = verifySignedContent(session, data, publicKey);
        
        String challengePrefix = "IDSIG " + userInfo.SessionUID;
        for(String verifiedContent : verifiedContentList) {
            int pos = verifiedContent.indexOf(challengePrefix);
            if(pos != -1) {
                String IDSIG = verifiedContent.substring(pos);
                String[] split = IDSIG.split(" ",6);
//                userInfo.UserName = split[2];
                String sessionUID = split[1];
                if(sessionUID.compareTo(userInfo.SessionUID) != 0)
                    throw new PGPException("Session UID String Mismatch: " + sessionUID);
//                String sessionID = split[2];
//                if(sessionID.compareTo(session.getId()) != 0)
//                    throw new PGPException("Session ID Mismatch: " + sessionID);
                userInfo.UserName = split[2];
                userInfo.Visibility = split[3];
//                userInfo.CacheTime = Integer.parseInt(split[5]);
                sendText(session, IDSIG); // "INFO User Identified: " + userInfo.UserName + " [" + userInfo.Visibility + "]");
            }
        }
            //            mIDKeys.put(session, key);

//        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }
    
    
    public ArrayList<String> verifySignedContent(Session session, String data, PGPPublicKey publicKey) throws PGPException {
        Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
        
        ArrayList<String> verifiedContent = new ArrayList<>();
        int sPos, mPos, fPos = 0;
        while(true) {

            String tag = "-----BEGIN PGP SIGNED MESSAGE-----";
            sPos = data.indexOf(tag, fPos);
            if(sPos == -1)
                break;
            int textSPos = data.indexOf("\n\n", sPos);
            if(textSPos == -1)
                throw new PGPException("Couldn't find start of signed text");
            textSPos += 2;

            tag = "-----BEGIN PGP SIGNATURE-----";
            mPos = data.indexOf(tag, sPos);
            if(mPos == -1)
                throw new PGPException("No " + tag + " found");

            tag = "-----END PGP SIGNATURE-----";
            fPos = data.indexOf(tag, mPos);
            if(fPos == -1)
                throw new PGPException("No " + tag + " found");
            fPos += tag.length();

            String unverifiedContent = data.substring(textSPos, mPos-1);
            String signatureArmored = data.substring(mPos, fPos);
            try {
                InputStream in=new ByteArrayInputStream(signatureArmored.getBytes());
                in = PGPUtil.getDecoderStream(in);
                PGPObjectFactory pgpF = new PGPObjectFactory(in, new JcaKeyFingerprintCalculator());

                PGPEncryptedDataList enc;
                Object o;
                while((o = pgpF.nextObject()) != null) {

                    if(o instanceof PGPSignatureList) {
                        PGPSignatureList list = (PGPSignatureList) o;
                        Iterator<PGPSignature> it = list.iterator();
                        while(it.hasNext()) {
                            InputStream unverifiedContentIn = new ByteArrayInputStream(unverifiedContent.getBytes());

                            PGPSignature sig = it.next();
                            sig.init(new JcaPGPContentVerifierBuilderProvider().setProvider("BC"), publicKey);
                            int ch;
                            while ((ch = unverifiedContentIn.read()) >= 0) {
                                sig.update((byte)ch);
                            }

                            if (sig.verify()) {
                                sendText(session, "INFO Verified Signature: " + Long.toHexString(sig.getKeyID()).toUpperCase());
                                verifiedContent.add(unverifiedContent);
                            }
                            else {
                                sendText(session, "ERROR Could not verify signature: " + Long.toHexString(sig.getKeyID()).toUpperCase());
                                throw new IOException("Could not verify signature: " + Long.toHexString(sig.getKeyID()).toUpperCase());
                            }
    //                        sig.(publicKey);
                        }
                    } else {
                        sendText(session, "ERROR Unrecognized Object: " + o.getClass());

                    }
                }

            } catch (IOException ex) {
                sendText(session, "ERROR " + ex);
                Logger.getLogger(PGPCommands.class.getName()).log(Level.SEVERE, null, ex);
                throw new PGPException(ex.getMessage(), ex);
            }

        }
        
        return verifiedContent;
    }
    
    public PGPPublicKey identifyPublicKeyBlock(Session session, String data) throws PGPException {
        String tag = "-----BEGIN PGP PUBLIC KEY BLOCK-----";
        int sPos = data.indexOf(tag);
        if(sPos == -1)
            throw new PGPException("No " + tag + " found");
        
        tag = "-----END PGP PUBLIC KEY BLOCK-----";
        int fPos = data.indexOf(tag, sPos);
        if(fPos == -1)
            throw new PGPException("No " + tag + " found");
        fPos += tag.length();
        String publicKeyString = data.substring(sPos, fPos);
        try {
            InputStream in=new ByteArrayInputStream(publicKeyString.getBytes());
            in = PGPUtil.getDecoderStream(in);
            JcaPGPPublicKeyRingCollection pgpPub = new JcaPGPPublicKeyRingCollection(in);
            in.close();
            Iterator<PGPPublicKeyRing> rIt = pgpPub.getKeyRings();
            PGPPublicKeyRing kRing = rIt.next();
            Iterator<PGPPublicKey> kIt = kRing.getPublicKeys();
            PGPPublicKey key = kIt.next();
            return key;
            
        } catch (IOException ex) {
            Logger.getLogger(PGPCommands.class.getName()).log(Level.SEVERE, null, ex);
            throw new PGPException(ex.getMessage(), ex);
        }


    }
    
    private void sendText(Session session, String text) {
        try {
            System.out.println(getSessionPGPInfo(session).SessionUID + " SENDING " + text); 
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
    
    private static PGPCommands _inst = null;
    public static PGPCommands getStatic() {
        if(_inst != null)
            return _inst;
        _inst = new PGPCommands();
        return _inst;
    }
    
}

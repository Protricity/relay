/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package relay.session;

import java.util.ArrayList;
import javax.websocket.Session;

/**
 *
 * @author ari
 */
public class SessionManager {
    private static ArrayList<Subscription> mSubscriptions = new ArrayList<Subscription>();
    public void subscribe(Session session, String path) {
        mSubscriptions.add(new Subscription(session, path));
    }
    
    public void unsubscribe(Session session, String path) {
        
    }
    
    public class Subscription
    {
        public Session session;
        public String path;

        private Subscription(Session session, String path) {
            this.session = session;
            this.path = path;
        }
    }
}

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package relay.os.service.websocket;


import javax.websocket.Session;

/**
 *
 * @author ari
 */
public interface ISocketCommand {
    /**
     * Return the command name
     * @return 
     */
    String getCommandName();
    
    /**
     * Execute the socket command 
     * @param data 
     * @param session 
     */
    void executeCommand(String data, Session session);
    
    /**
     * Allows for custom command matching
     */
    public interface ISocketCommandMatch extends ISocketCommand {
        /**
         * Match a command against incoming data
         * @param data
         * @param session
         * @return 
         */
        boolean match(String data, Session session);
    }
}


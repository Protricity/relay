/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package relay.service.command;


import javax.websocket.Session;

/**
 *
 * @author ari
 */
public interface ISocketCommand {
    /**
     * Execute the socket command 
     * @param data 
     * @param session 
     * @return  
     * @throws java.lang.Exception  
     */
    boolean executeCommand(String data, Session session) throws Exception;
    
}


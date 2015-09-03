/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package relay.service;

import relay.service.command.ISocketCommand;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
 
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import relay.service.command.ChannelCommands;
import relay.service.command.PGPCommands;
import relay.service.command.RESTCommands;
 
/** 
 * @ServerEndpoint gives the relative name for the end point
 * This will be accessed via ws://localhost:8080/[appname]/socket
 * Where "localhost" is the address of the host,
 * "EchoChamber" is the name of the package
 * and "echo" is the address to access this class from the server
 */
@ServerEndpoint("/socket") 
public class WebSocketServer {
    
    private final ArrayList<ISocketCommand> callbacks = new ArrayList<>();
    
    public WebSocketServer() {
        callbacks.add(ChannelCommands.getStatic());
        callbacks.add(PGPCommands.getStatic());
        callbacks.add(RESTCommands.getStatic());
    }
    
    public final void addCommand(ISocketCommand command) {
        callbacks.add(command);
    }
    
    /**
     * @param session
     * @OnOpen allows us to intercept the creation of a new session.
     * The session class allows us to send data to the user.
     * In the method onOpen, we'll let the user know that the handshake was 
     * successful.
     */
    @OnOpen
    public void onOpen(Session session){
        System.out.println(session.getId() + " has opened a connection"); 
        try {
            session.getBasicRemote().sendText("INFO WebSocketServer.onSocketOpen() Connection Established: \n\t" + session.getId());
//            Object ipProp = session.getUserProperties().get("javax.websocket.endpoint.remoteAddress");
//            if(ipProp != null)
//                session.getBasicRemote().sendText("INFO Remote Address: " + ipProp.toString() );
            

            for(int i=0; i<callbacks.size(); i++) {
                try {
                    ISocketCommand command = callbacks.get(i);
                    command.onSocketOpen(session);

                } catch (Exception ex) {
                    session.getBasicRemote().sendText("ERROR WebSocketServer.onSocketOpen() " + ex.getMessage());
                    ex.printStackTrace();
                }
            }

        } catch (IOException ex) {
            ex.printStackTrace();
        }
    }
 
    /**
     * When a user sends a message to the server, this method will intercept the message
     * and allow us to react to it. For now the message is read as a String.
     * @param message
     * @param session
     * @throws java.io.IOException
     */
    @OnMessage
    public void onMessage(String message, Session session) throws IOException{
        System.out.println("Message from " + session.getId() + ": " + message);
//        session.getBasicRemote().sendText("ECHO " + message);
        
//        String[] args = message.split("\\s+", 2);
        for(int i=0; i<callbacks.size(); i++) {
            try {
                ISocketCommand command = callbacks.get(i);
                if(!command.executeCommand(message, session))
                    continue;
                
            } catch (Exception ex) {
                StringWriter sw = new StringWriter();
                PrintWriter pw = new PrintWriter(sw);
                ex.printStackTrace(pw);
                String stackTrace = sw.toString(); // stack trace as a string

                session.getBasicRemote().sendText("ERROR WebSocketServer.onMessage() " + ex + stackTrace);
                ex.printStackTrace();
            }
        }
    }
 
    /**
     * The user closes the connection.
     * 
     * Note: you can't send messages to the client from this method
     */
    @OnClose
    public void onClose(Session session){
        System.out.println("Session " + session.getId()+" has ended");
        try {
            session.getBasicRemote().sendText("INFO WebSocketServer.onClose() Connection Closed: " + session.getId());

            for(int i=0; i<callbacks.size(); i++) {
                try {
                    ISocketCommand command = callbacks.get(i);
                    command.onSocketOpen(session);

                } catch (Exception ex) {
                    session.getBasicRemote().sendText("ERROR WebSocketServer.onClose() " + ex.getMessage());
                    ex.printStackTrace();
                }
            }

        } catch (IOException ex) {
            ex.printStackTrace();
        }
    }

    @OnError
    public void onError(Throwable t) {
        System.out.println("Error: WebSocketServer.onError() " + t.getMessage());
    }
}

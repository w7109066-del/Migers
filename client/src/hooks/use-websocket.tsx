import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { useNotifications } from './use-notifications';

type WebSocketContextType = {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendChatMessage: (content: string, roomId?: string, recipientId?: string) => void;
  setTyping: (roomId: string, isTyping: boolean) => void;
  sendDirectMessage: (content: string, recipientId: string) => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { addNotification } = useNotifications();

  const connect = () => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // For Replit environment, construct proper WebSocket URL
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    console.log('Attempting to connect to WebSocket:', wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Send authentication message after connection is established
      setTimeout(() => {
        if (user && ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'authenticate',
            userId: user.id,
          }));
        }
      }, 100);
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'authenticated':
            console.log('WebSocket authenticated successfully');
            break;

          case 'new_message':
            // Handle new room message
            window.dispatchEvent(new CustomEvent('newMessage', {
              detail: message.message
            }));
            break;

          case 'new_direct_message':
            // Handle new direct message
            window.dispatchEvent(new CustomEvent('newDirectMessage', {
              detail: message.message
            }));
            break;

          case 'user_joined':
            window.dispatchEvent(new CustomEvent('userJoined', {
              detail: { userId: message.userId, username: message.username, roomId: message.roomId }
            }));
            break;

          case 'user_left':
            window.dispatchEvent(new CustomEvent('userLeft', {
              detail: {
                username: message.username || 'User',
                roomId: message.roomId
              }
            }));
            break;

          case 'kicked_from_room':
            alert(`You have been kicked from the room: ${message.message}`);
            window.location.href = '/';
            break;

          case 'room_closed':
            alert(`Room has been closed: ${message.message}`);
            window.location.href = '/';
            break;

          case 'user_typing':
            window.dispatchEvent(new CustomEvent('userTyping', {
              detail: {
                userId: message.userId,
                roomId: message.roomId,
                isTyping: message.isTyping
              }
            }));
            break;

          case 'error':
            toast({
              title: "Connection Error",
              description: message.message,
              variant: "destructive",
            });
            break;

          case 'friend_request_received':
            console.log('Received friend request notification:', message);
            addNotification({
              type: 'friend_request_received',
              title: 'New Friend Request',
              message: `${message.fromUser?.username || 'Someone'} sent you a friend request`,
              fromUser: message.fromUser,
              actionRequired: true,
            });
            
            // Dispatch custom event for real-time UI updates
            window.dispatchEvent(new CustomEvent('websocket-notification', {
              detail: {
                type: 'new_notification',
                notification: {
                  type: 'friend_request_received',
                  title: 'New Friend Request',
                  message: `${message.fromUser?.username || 'Someone'} sent you a friend request`,
                  fromUser: message.fromUser,
                  actionRequired: true,
                  isRead: false,
                  createdAt: new Date().toISOString()
                }
              }
            }));
            break;
          case 'friend_request_accepted':
            console.log('Friend request accepted notification received:', message);
            addNotification({
              type: 'friend_accepted',
              title: 'Friend Request Accepted',
              message: `${message.fromUser?.username || 'Someone'} accepted your friend request`,
              fromUser: message.fromUser,
            });
            // Refresh friend list
            window.dispatchEvent(new CustomEvent('friendListUpdate'));
            break;
          case 'new_notification':
            console.log('New notification received:', message.notification);
            if (message.notification) {
              addNotification(message.notification);
              
              // If it's a friend request accepted, also refresh friend list
              if (message.notification.type === 'friend_request_accepted') {
                window.dispatchEvent(new CustomEvent('friendListUpdate'));
              }
            }
            break;
          case 'gift_received':
            addNotification({
              type: 'gift_received',
              title: 'Gift Received!',
              message: `You received ${message.gift?.name || 'a gift'} from ${message.fromUser?.username || 'someone'}`,
              fromUser: message.fromUser,
              data: message.gift,
            });
            break;
          case 'credit_received':
            addNotification({
              type: 'credit_received',
              title: 'Credits Received!',
              message: `You received ${message.amount || 0} credits`,
              data: { amount: message.amount },
            });
            break;
          case 'room_member_count_updated':
            window.dispatchEvent(new CustomEvent('room_member_count_updated', {
              detail: { roomId: message.roomId, memberCount: message.memberCount }
            }));
            break;
          case 'friend_list_updated':
            console.log('Friend list updated via WebSocket');
            // Trigger friend list refresh
            window.dispatchEvent(new CustomEvent('friendListUpdate'));
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);

      // Attempt to reconnect after 3 seconds
      if (user) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  useEffect(() => {
    if (user) {
      connect();
    } else {
      // Disconnect if user logs out
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setIsConnected(false);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current && isConnected && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.log('WebSocket not ready, message queued:', message);
    }
  }, [isConnected]);

  const joinRoom = (roomId: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'join_room',
        roomId,
      });
    }
  };

  const leaveRoom = (roomId: string) => {
    sendMessage({
      type: 'leave_room',
      roomId,
    });
  };

  const sendChatMessage = (content: string, roomId?: string, recipientId?: string) => {
    sendMessage({
      type: 'send_message',
      content,
      roomId,
      recipientId,
      messageType: 'text',
    });
  };

  const sendDirectMessage = (content: string, recipientId: string) => {
    sendMessage({
      type: 'direct_message',
      content,
      recipientId,
    });
  };

  const setTyping = (roomId: string, isTyping: boolean) => {
    sendMessage({
      type: 'typing',
      roomId,
      isTyping,
    });
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        joinRoom,
        leaveRoom,
        sendChatMessage,
        setTyping,
        sendDirectMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);

      // Authenticate with the server
      ws.current?.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id,
      }));
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
              detail: { userId: message.userId, roomId: message.roomId }
            }));
            break;

          case 'user_left':
            window.dispatchEvent(new CustomEvent('userLeft', {
              detail: { userId: message.userId, roomId: message.roomId }
            }));
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
            addNotification({
              type: 'friend_request',
              title: 'New Friend Request',
              message: `${message.fromUser?.username || 'Someone'} sent you a friend request`,
              fromUser: message.fromUser,
            });
            break;
          case 'friend_request_accepted':
            addNotification({
              type: 'friend_accepted',
              title: 'Friend Request Accepted',
              message: `${message.fromUser?.username || 'Someone'} accepted your friend request`,
              fromUser: message.fromUser,
            });
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

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  const joinRoom = (roomId: string) => {
    sendMessage({
      type: 'join_room',
      roomId,
    });
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
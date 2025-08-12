import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { useNotifications } from './use-notifications';
import { queryClient } from '../lib/queryClient';
import { io, Socket } from 'socket.io-client';

type WebSocketContextType = {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string, forceLeave?: boolean) => void;
  sendChatMessage: (content: string, roomId?: string, recipientId?: string) => void;
  setTyping: (roomId: string, isTyping: boolean) => void;
  sendDirectMessage: (content: string, recipientId: string) => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const socket = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { addNotification } = useNotifications();

  // Track joined rooms in localStorage to prevent leaving on tab switch
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const sessionId = useRef<string>(`session-${Date.now()}-${Math.random()}`);

  // Initialize joined rooms from localStorage
  useEffect(() => {
    if (user) {
      const savedJoinedRooms = localStorage.getItem(`joinedRooms-${user.id}`);
      if (savedJoinedRooms) {
        try {
          const roomsArray = JSON.parse(savedJoinedRooms);
          joinedRoomsRef.current = new Set(roomsArray);
          console.log('Restored joined rooms from localStorage:', roomsArray);
        } catch (error) {
          console.error('Failed to parse saved joined rooms:', error);
          joinedRoomsRef.current = new Set();
        }
      }
    }
  }, [user]);

  const connect = () => {
    if (!user) {
      console.log('No user, skipping WebSocket connection');
      return;
    }

    // Prevent multiple connections
    if (socket.current && socket.current.connected) {
      console.log('Socket.IO already connected, skipping...');
      return;
    }

    // Clean up existing socket if it exists but is not connected
    if (socket.current) {
      console.log('Cleaning up existing disconnected socket');
      socket.current.disconnect();
      socket.current = null;
    }

    console.log('Attempting to connect to Socket.IO server for user:', user.username);
    socket.current = io(window.location.origin, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 15000,
      transports: ['websocket', 'polling'],
      upgrade: true,
      forceNew: true,
    });

    socket.current.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);

      // Reset reconnection attempts on successful connection
      global.reconnectAttempts = 0;

      // Send authentication message after connection is established
      if (user && socket.current) {
        socket.current.emit('authenticate', {
          userId: user.id,
        });
      }
    });

    socket.current.on('authenticated', (data) => {
      console.log('Socket.IO authenticated successfully:', data);

      // Clear any previous authentication errors
      if (data.success) {
        console.log('Authentication successful for user:', data.user?.username);
      }
    });

    socket.current.on('new_message', (data) => {
      // Handle new room message
      window.dispatchEvent(new CustomEvent('newMessage', {
        detail: data.message
      }));
    });

    socket.current.on('new_direct_message', (data) => {
      // Handle new direct message
      window.dispatchEvent(new CustomEvent('newDirectMessage', {
        detail: data.message
      }));
    });

    socket.current.on('user_joined', (data) => {
      // Only dispatch if we have a valid userId and roomId
      if (data.userId && data.roomId) {
        window.dispatchEvent(new CustomEvent('userJoined', {
          detail: { 
            userId: data.userId, 
            username: data.username || 'User', 
            roomId: data.roomId 
          }
        }));
      }
    });

    socket.current.on('user_left', (data) => {
      window.dispatchEvent(new CustomEvent('userLeft', {
        detail: {
          username: data.username || 'User',
          roomId: data.roomId
        }
      }));
    });

    socket.current.on('kicked_from_room', (data) => {
      alert(`You have been kicked from the room: ${data.message}`);
      window.location.href = '/';
    });

    socket.current.on('room_closed', (data) => {
      alert(`Room has been closed: ${data.message}`);
      window.location.href = '/';
    });

    socket.current.on('user_typing', (data) => {
      window.dispatchEvent(new CustomEvent('userTyping', {
        detail: {
          userId: data.userId,
          username: data.username,
          roomId: data.roomId,
          isTyping: data.isTyping
        }
      }));
    });

    socket.current.on('error', (data) => {
      console.log('Socket error:', data);
      
      // Show toast notification for critical errors
      if (data.message && data.message.includes('banned')) {
        toast({
          title: "Access Restricted",
          description: data.message,
          variant: "destructive",
          duration: 5000,
        });
      } else if (data.message && data.message.includes('not in the chatroom')) {
        toast({
          title: "Chat Room Error",
          description: "You are not in this chatroom",
          variant: "destructive",
          duration: 3000,
        });
      }
      
      // Dispatch custom event for chat room to handle
      window.dispatchEvent(new CustomEvent('socketError', { 
        detail: data 
      }));
    });

          socket.current.on('friend_request_received', (data) => {
      console.log('Received friend request notification:', data);
      addNotification({
        type: 'friend_request_received',
        title: 'New Friend Request',
        message: `${data.fromUser?.username || 'Someone'} sent you a friend request`,
        fromUser: data.fromUser,
        actionRequired: true,
      });

      // Dispatch custom event for real-time UI updates
      window.dispatchEvent(new CustomEvent('websocket-notification', {
        detail: {
          type: 'new_notification',
          notification: {
            type: 'friend_request_received',
            title: 'New Friend Request',
            message: `${data.fromUser?.username || 'Someone'} sent you a friend request`,
            fromUser: data.fromUser,
            actionRequired: true,
            isRead: false,
            createdAt: new Date().toISOString()
          }
        }
      }));
    });

    socket.current.on('friend_request_accepted', (data) => {
      console.log('Friend request accepted notification received:', data);

      // Dispatch custom event to clear friend request notifications
      window.dispatchEvent(new CustomEvent('clear-friend-request-notifications', {
        detail: { fromUserId: data.fromUser?.id }
      }));

      addNotification({
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${data.fromUser?.username || 'Someone'} accepted your friend request`,
        fromUser: data.fromUser,
      });
      // Refresh friend list immediately
      window.dispatchEvent(new CustomEvent('friendListUpdate'));
    });

    socket.current.on('new_notification', (data) => {
      console.log('New notification received:', data.notification);
      if (data.notification) {
        addNotification(data.notification);

        // If it's a friend request accepted, also refresh friend list
        if (data.notification.type === 'friend_request_accepted') {
          console.log('Triggering friend list update for accepted request');
          window.dispatchEvent(new CustomEvent('friendListUpdate'));
        }
      }
    });

    socket.current.on('gift_received', (data) => {
      addNotification({
        type: 'gift_received',
        title: 'Gift Received!',
        message: `You received ${data.gift?.name || 'a gift'} from ${data.fromUser?.username || 'someone'}`,
        fromUser: data.fromUser,
        data: data.gift,
      });
    });

    socket.current.on('credit_received', (data) => {
      addNotification({
        type: 'credit_received',
        title: 'Credits Received!',
        message: `You received ${data.amount || 0} credits`,
        data: { amount: data.amount },
      });
    });

    socket.current.on('room_member_count_updated', (data) => {
      window.dispatchEvent(new CustomEvent('room_member_count_updated', {
        detail: { roomId: data.roomId, memberCount: data.memberCount }
      }));
    });

    socket.current.on('friend_list_updated', () => {
      console.log('Friend list updated via Socket.IO - forcing refresh');

      // Clear ALL friend-related cache
      queryClient.removeQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.removeQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });

      // Trigger custom event for components listening
      window.dispatchEvent(new CustomEvent('friendListUpdate'));

      // Additional delayed refresh to ensure data is updated
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('friendListUpdate'));
      }, 1000);
    });

    socket.current.on('force_member_refresh', (data) => {
      // Force refresh room member list
      window.dispatchEvent(new CustomEvent('forceMemberRefresh', {
        detail: { roomId: data.roomId }
      }));
    });

    socket.current.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setIsConnected(false);
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);

      // Show user-friendly error message for persistent connection issues
      if (global.reconnectAttempts > 3) {
        toast({
          title: "Connection Issues",
          description: "Having trouble connecting to the server. Please check your internet connection.",
          variant: "destructive",
          duration: 5000,
        });
      }
    });

    socket.current.on('reconnect_error', (error) => {
      console.error('Socket.IO reconnection error:', error);
      global.reconnectAttempts = (global.reconnectAttempts || 0) + 1;
    });

    socket.current.on('reconnect', (attemptNumber) => {
      console.log(`Socket.IO reconnected after ${attemptNumber} attempts`);
      global.reconnectAttempts = 0;

      toast({
        title: "Connection Restored",
        description: "Successfully reconnected to the server.",
        variant: "default",
        duration: 3000,
      });
    });

    socket.current.connect();
  };

  useEffect(() => {
    if (user) {
      connect();
    } else {
      // Disconnect if user logs out
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
      setIsConnected(false);
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden/minimized - don't disconnect, just reduce activity
        console.log('App minimized - maintaining connection');
      } else {
        // Page is visible again - ensure connection is active
        console.log('App restored - checking connection');
        if (user && (!socket.current || !socket.current.connected)) {
          console.log('Reconnecting after app restore');
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket.current) {
        socket.current.disconnect();
      }

      // Clean up localStorage on component unmount (logout)
      if (!user && joinedRoomsRef.current.size > 0) {
        console.log('User logged out - clearing joined rooms from localStorage');
        joinedRoomsRef.current.clear();
      }
    };
  }, [user]);

  const sendMessage = useCallback((eventName: string, data: any) => {
    if (socket.current && isConnected && socket.current.connected) {
      socket.current.emit(eventName, data);
    } else {
      console.log('Socket.IO not ready, message queued:', eventName, data);
    }
  }, [isConnected]);

  const joinRoom = (roomId: string) => {
    if (!roomId) {
      console.error('Cannot join room: no roomId provided');
      return;
    }

    // Check if already joined this room to prevent duplicate joins
    if (joinedRoomsRef.current.has(roomId)) {
      console.log('Already joined room:', roomId, '- skipping WebSocket join');
      return;
    }

    if (socket.current && socket.current.connected && user) {
      console.log('Sending join_room request for:', roomId);
      sendMessage('join_room', {
        roomId,
        sessionId: sessionId.current,
      });

      // Add to joined rooms tracking
      joinedRoomsRef.current.add(roomId);

      // Save to localStorage for persistence across tabs
      const joinedRoomsArray = Array.from(joinedRoomsRef.current);
      localStorage.setItem(`joinedRooms-${user.id}`, JSON.stringify(joinedRoomsArray));

      console.log('Joined room and saved to localStorage:', roomId);
    } else {
      console.error('Cannot join room: WebSocket not connected');
      toast({
        title: "Connection Error",
        description: "Cannot join room - not connected to server",
        variant: "destructive",
      });
    }
  };

  const leaveRoom = (roomId: string, forceLeave: boolean = false) => {
    if (!roomId || !user) return;

    // Only actually leave room if explicitly forced (user clicks leave)
    // Don't leave room for UI tab switches
    if (forceLeave) {
      console.log('Force leaving room:', roomId);
      sendMessage('leave_room', {
        roomId,
        sessionId: sessionId.current,
      });

      // Remove from joined rooms tracking
      joinedRoomsRef.current.delete(roomId);

      // Update localStorage
      const joinedRoomsArray = Array.from(joinedRoomsRef.current);
      localStorage.setItem(`joinedRooms-${user.id}`, JSON.stringify(joinedRoomsArray));

      console.log('Left room and removed from localStorage:', roomId);
    } else {
      console.log('UI tab switch detected - NOT leaving room:', roomId);
    }
  };

  const sendChatMessage = (content: string, roomId?: string, recipientId?: string) => {
    // Check if the user is in the member list of the current room before sending a message
    // This assumes there's a way to access the member list or a check function.
    // For now, we'll just send and let the backend handle validation if no member list is available here.
    // A more robust solution would involve fetching the member list or passing it down.

    // Placeholder for member list check:
    // if (roomId && !isUserInMemberList(user.id, roomId)) {
    //   window.dispatchEvent(new CustomEvent('errorMessage', { 
    //     detail: { message: "You are not in this chatroom." } 
    //   }));
    //   return;
    // }

    sendMessage('send_message', {
      content,
      roomId,
      recipientId,
      messageType: 'text',
    });
  };

  const sendDirectMessage = (content: string, recipientId: string) => {
    sendMessage('send_message', {
      content,
      recipientId,
    });
  };

  const setTyping = (roomId: string, isTyping: boolean) => {
    sendMessage('typing', {
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